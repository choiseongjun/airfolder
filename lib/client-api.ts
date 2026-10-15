import {isBrowse,browseResponse} from './browse-data';
export async function api<T = Record<string, unknown>>(url: string, options: RequestInit = {}): Promise<T> {
  if(isBrowse())return browseResponse(url,options.method||'GET') as T;
  if(url==='/api/photos'&&options.method==='POST'&&options.body instanceof FormData){
    const form=options.body,file=form.get('file');
    if(file instanceof Blob){
      const metadata=Object.fromEntries([...form.entries()].filter(([key])=>key!=='file'));
      const upload=await api<{complete:boolean;chunkSize:number;parts:number[]}>('/api/photos/uploads',{method:'POST',body:JSON.stringify({...metadata,size:file.size,mime:file.type})});
      if(upload.complete)return {id:metadata.id} as T;
      for(let part=0;part<Math.ceil(file.size/upload.chunkSize);part++){
        if(upload.parts.includes(part))continue;
        const response=await fetch(`/api/photos/uploads?id=${metadata.id}&part=${part}`,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/octet-stream'},body:file.slice(part*upload.chunkSize,(part+1)*upload.chunkSize)});
        if(!response.ok){const data=await response.json();throw new Error(data.error||'UPLOAD_FAILED');}
      }
      return api<T>('/api/photos',{method:'POST',body:JSON.stringify({uploadId:metadata.id})});
    }
  }
  const response = await fetch(url, { ...options, credentials: 'same-origin', cache: 'no-store', headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'SERVER_ERROR');
  return data as T;
}

let sessionRequest: Promise<{ viewerId: string }> | undefined;
export function initializeSession() {
  return sessionRequest ??= api<{ viewerId: string }>('/api/session', { method: 'POST' }).finally(() => { sessionRequest = undefined; });
}
