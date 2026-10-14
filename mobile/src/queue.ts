import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { getSession } from './api';
import { eligible, type Candidate, type QueueItem, type Session } from './model';

const storageKey = 'snaproom-uploads-v1';
const directory = () => FileSystem.documentDirectory + 'snaproom-uploads/';
const listeners = new Set<() => void>();
let mutation: Promise<unknown> = Promise.resolve();
let running: Promise<void> | null = null;
export function queueIsRunning() { return running !== null; }
export function subscribeQueue(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export async function readQueue(): Promise<QueueItem[]> { return JSON.parse(await AsyncStorage.getItem(storageKey) || '[]'); }
async function update(work: (items: QueueItem[]) => QueueItem[]) {
  const result = mutation.then(async () => { const next = work(await readQueue()); await AsyncStorage.setItem(storageKey, JSON.stringify(next)); listeners.forEach(fn => fn()); });
  mutation = result.catch(() => {}); await result;
}
async function change(id: string, values: Partial<QueueItem>) { await update(items => items.map(item => item.id === id ? { ...item, ...values } : item)); }
export async function enqueue(candidates: Candidate[], folderId: string, session: Session) {
  await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
  let added = 0, skipped = 0, failed = 0;
  for (const candidate of candidates) {
    const key = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, candidate.key);
    if ((await readQueue()).some(i => i.owner === session.viewerId && i.origin === session.origin && i.folderId === folderId && i.assetKey === key)) { skipped++; continue; }
    const id = Crypto.randomUUID(), file = `${id}.jpg`;
    let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;
    let image: Awaited<ReturnType<NonNullable<typeof context>['renderAsync']>> | undefined;
    let resized: typeof image;
    let temporary: string | undefined;
    let committed = false;
    try {
      context = ImageManipulator.manipulate(candidate.uri);
      image = await context.renderAsync();
      const width = image.width, height = image.height;
      if (Math.max(width, height) > 2560) context.resize(width >= height ? { width: 2560 } : { height: 2560 });
      resized = await context.renderAsync();
      const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
      temporary = saved.uri;
      await FileSystem.copyAsync({ from: saved.uri, to: directory() + file });
      await update(items => [...items, { id, owner: session.viewerId, origin: session.origin, folderId, assetKey: key, name: candidate.name, created: candidate.created, file, status: 'pending', attempts: 0, nextAttempt: 0 }]);
      committed = true; added++;
    } catch { if (!committed) { await FileSystem.deleteAsync(directory() + file, { idempotent: true }).catch(() => {}); failed++; } }
    finally {
      if (temporary) await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => {});
      try { image?.release(); resized?.release(); context?.release(); } catch {}
    }
  }
  return { added, skipped, failed };
}
async function drain() {
  const session = await getSession(); if (!session || session.expiresAt <= Date.now()) return;
  const pending = (await readQueue()).filter(item => eligible(item, session)).slice(0, 100);
  for (const item of pending) {
    const current = await getSession(); if (current?.token !== session.token) return;
    if (!(await readQueue()).some(i => i.id === item.id && eligible(i, session))) continue;
    await change(item.id, { status: 'uploading', error: undefined });
    try {
      const result = await FileSystem.uploadAsync(session.origin + '/api/photos', directory() + item.file, {
        httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
        fieldName: 'file', mimeType: 'image/jpeg', headers: { Authorization: `Bearer ${session.token}` },
        parameters: { id: item.id, folderId: item.folderId, name: item.name, created: String(item.created), shared: 'false' },
      });
      if (result.status < 200 || result.status >= 300) {
        let code = `HTTP_${result.status}`; try { code = JSON.parse(result.body).error || code; } catch {}
        throw new Error(code);
      }
      await change(item.id, { status: 'uploaded', error: undefined });
      await FileSystem.deleteAsync(directory() + item.file, { idempotent: true }).catch(() => {});
    } catch (error) {
      await change(item.id, { status: 'failed', attempts: item.attempts + 1, nextAttempt: Date.now() + Math.min(3600000, 30000 * 2 ** item.attempts), error: error instanceof Error ? error.message : 'UPLOAD_FAILED' });
      if (error instanceof Error && /SESSION|TOKEN|401/.test(error.message)) break;
    }
  }
}
export function runQueue() { return running ??= drain().finally(() => { running = null; }); }
export async function retryFailed(session: Session) { await update(items => items.map(i => i.owner === session.viewerId && i.origin === session.origin && i.status === 'failed' ? { ...i, status: 'pending', attempts: 0, nextAttempt: 0, error: undefined } : i)); await runQueue(); }
export async function discardFailed(session: Session) {
  const removed: QueueItem[] = [];
  await update(items => items.filter(i => { if (i.owner === session.viewerId && i.origin === session.origin && i.status === 'failed') { removed.push(i); return false; } return true; }));
  for (const item of removed) await FileSystem.deleteAsync(directory() + item.file, { idempotent: true });
}
