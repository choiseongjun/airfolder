"use client";
import {useEffect,useRef,useState} from 'react';

// Private previews live only for this reader, never in persistent storage.
export function useBookPreviews(sources:string[],visibleCount:number){
 const cache=useRef(new Map<string,string>());
 const [resolved,setResolved]=useState<Map<string,string>>(()=>new Map());
 useEffect(()=>{
  const controller=new AbortController();
  const queue=sources.filter(src=>!cache.current.has(src)&&!src.startsWith('blob:')&&!src.startsWith('data:'));
  async function prepare(src:string){
   try{
    const response=await fetch(src,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});
    if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error('PREVIEW_UNAVAILABLE');
    const blob=await response.blob();
    if(controller.signal.aborted)return;
    const url=URL.createObjectURL(blob);
    const image=new Image();image.src=url;
    await image.decode().catch(()=>{});
    if(controller.signal.aborted){URL.revokeObjectURL(url);return;}
    cache.current.set(src,url);
   }catch{if(!controller.signal.aborted)cache.current.set(src,src);}
  }
  async function load(){
   // Finish the visible spread together before spending bandwidth on future pages.
   const visible=queue.filter(src=>sources.slice(0,visibleCount).includes(src));
   const upcoming=queue.filter(src=>!visible.includes(src));
   const batches=[visible,...Array.from({length:Math.ceil(upcoming.length/8)},(_,i)=>upcoming.slice(i*8,i*8+8))];
   for(const batch of batches){
    if(controller.signal.aborted)return;
    await Promise.all(batch.map(prepare));
    if(controller.signal.aborted)return;
    for(const [key,value] of cache.current){
     if(cache.current.size<=48)break;
     if(sources.includes(key))continue;
     URL.revokeObjectURL(value);cache.current.delete(key);
    }
    setResolved(new Map(cache.current));
   }
  }
  void load();
  return()=>controller.abort();
 },[sources,visibleCount]);
 useEffect(()=>{const entries=cache.current;return()=>{for(const url of entries.values())URL.revokeObjectURL(url);entries.clear();};},[]);
 return resolved;
}
