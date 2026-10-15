import { getSession, request } from './api';
import { eligible, type Candidate, type QueueItem, type Session } from './model';
type Entry = QueueItem & { blob?: Blob };
const listeners = new Set<() => void>();
let running: Promise<void> | null = null;
let opening: Promise<IDBDatabase> | undefined;
function database() {
  return opening ??= new Promise((resolve, reject) => {
    const open = indexedDB.open('snaproom-expo-web-uploads', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('queue', { keyPath: 'id' });
    open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
  });
}
async function entries(): Promise<Entry[]> {
  const db = await database();
  return new Promise((resolve, reject) => { const r = db.transaction('queue').objectStore('queue').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
async function write(entry: Entry, remove = false) {
  const db = await database();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction('queue', 'readwrite'); const store = tx.objectStore('queue'); if (remove) store.delete(entry.id); else store.put(entry); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  listeners.forEach(fn => fn());
}
export function subscribeQueue(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export async function readQueue(): Promise<QueueItem[]> { return (await entries()).map(({ blob: _blob, ...item }) => item); }
export function queueIsRunning() { return running !== null; }
export async function enqueue(candidates: Candidate[], folderId: string, session: Session) {
  let added = 0, failed = 0, skipped = 0;
  for (const candidate of candidates) {
    if ((await entries()).some(i => i.owner === session.viewerId && i.origin === session.origin && i.folderId === folderId && i.assetKey === candidate.key)) { skipped++; continue; }
    try {
      const blob = await (await fetch(candidate.uri)).blob();
      if(!blob.size||blob.size>(blob.type.startsWith('video/')?50:20)*1024*1024)throw new Error('MEDIA_TOO_LARGE');
      await write({ id: crypto.randomUUID(), owner: session.viewerId, origin: session.origin, folderId, assetKey: candidate.key, name: candidate.name, created: candidate.created, file: '', blob, status: 'pending', attempts: 0, nextAttempt: 0 }); added++;
    } catch { failed++; }

  }
  return { added, skipped, failed };
}
async function drain() {
  const session = await getSession(); if (!session) return;
  for (const item of (await entries()).filter(i => eligible(i, session))) {
    if ((await getSession())?.viewerId !== session.viewerId) return;
    await write({ ...item, status: 'uploading' });
    try {
      if (!item.blob) throw new Error('MISSING_FILE');
      const upload=await request<{complete:boolean;chunkSize:number;parts:number[]}>('/api/photos/uploads',{method:'POST',body:JSON.stringify({id:item.id,folderId:item.folderId,name:item.name,created:item.created,shared:false,size:item.blob.size,mime:item.blob.type})});
      if(!upload.complete){
        for(let part=0;part<Math.ceil(item.blob.size/upload.chunkSize);part++){
          if(upload.parts.includes(part))continue;
          await request(`/api/photos/uploads?id=${item.id}&part=${part}`,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:item.blob.slice(part*upload.chunkSize,(part+1)*upload.chunkSize)});
        }
        await request('/api/photos',{method:'POST',body:JSON.stringify({uploadId:item.id})});
      }
      await write({ ...item, blob: undefined, status: 'uploaded', error: undefined });
    } catch (error) { await write({ ...item, status: 'failed', attempts: item.attempts + 1, nextAttempt: Date.now() + Math.min(3600000, 30000 * 2 ** item.attempts), error: error instanceof Error ? error.message : 'UPLOAD_FAILED' }); }
  }
}
export function runQueue() { return running ??= drain().finally(() => { running = null; }); }
export async function retryFailed(session: Session) { for (const item of await entries()) if (item.owner === session.viewerId && item.origin === session.origin && item.status === 'failed') await write({ ...item, status: 'pending', attempts: 0, nextAttempt: 0 }); await runQueue(); }
export async function discardFailed(session: Session) { for (const item of await entries()) if (item.owner === session.viewerId && item.origin === session.origin && item.status === 'failed') await write(item, true); }
export async function clearAccountHistory(session:Session){if(running)throw new Error('UPLOAD_IN_PROGRESS');for(const item of await entries())if(item.owner===session.viewerId&&item.origin===session.origin)await write(item,true);}
