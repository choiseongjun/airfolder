"use client";
import {useEffect,useRef,useState} from 'react';

// Private previews live only for this reader, never in persistent storage.
export function useBookPreviews(sources:string[]){
 const cache=useRef(new Map<string,string>());
 const [resolved,setResolved]=useState<Map<string,string>>(()=>new Map());
 useEffect(()=>{
  const controller=new AbortController();
  const queue=sources.filter(src=>!cache.current.has(src)&&!src.startsWith('blob:')&&!src.startsWith('data:'));
  async function worker(){
   while(queue.length&&!controller.signal.aborted){
    const src=queue.shift()!;
    try{
     const response=await fetch(src,{signal:controller.signal});
     if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))throw new Error('PREVIEW_UNAVAILABLE');
     const blob=await response.blob();
     if(controller.signal.aborted) return;
     const url=URL.createObjectURL(blob);
     cache.current.set(src,url);
     // Retain recent pages, with a bounded number of compressed images.
     for(const [key,value] of cache.current){
      if(cache.current.size<=48)break;
      if(sources.includes(key))continue;
      URL.revokeObjectURL(value);cache.current.delete(key);
     }
     setResolved(new Map(cache.current));
    }catch{if(!controller.signal.aborted){cache.current.set(src,src);setResolved(new Map(cache.current));}}
   }
  }
  void Promise.all(Array.from({length:3},()=>worker()));
  return()=>controller.abort();
 },[sources]);
 useEffect(()=>{const entries=cache.current;return()=>{for(const url of entries.values())URL.revokeObjectURL(url);entries.clear();};},[]);
 return resolved;
}
