"use client";
/* eslint-disable @next/next/no-img-element */
import {useCallback,useEffect,useState} from 'react';
type MediaProps={src:string;name:string;mediaType?:string;full?:boolean;eager?:boolean;loadingLabel?:string};
export default function MediaView(props:MediaProps){return <MediaContent key={props.src} {...props}/>;}
function MediaContent({src,name,mediaType,full=false,eager=false,loadingLabel}:MediaProps){
  const [loaded,setLoaded]=useState(false);
  const imageRef=useCallback((image:HTMLImageElement|null)=>{if(image?.complete && image.naturalWidth>0)setLoaded(true);},[]);
  const [failed,setFailed]=useState(false);
  const [status,setStatus]=useState('');
  useEffect(()=>{
    if(!failed || !src.startsWith('/api/photos/'))return;
    let active=true;const controller=new AbortController();
    const check=async()=>{try{const response=await fetch(src+(src.includes('?')?'&':'?')+'status=1',{signal:controller.signal});if(!response.ok)return;const data=await response.json();if(active){setStatus(data.status);if(data.status==='ready')setFailed(false);}}catch{}};
    void check();const timer=setInterval(check,15000);return()=>{active=false;controller.abort();clearInterval(timer);};
  },[failed,src]);
  if(failed)return <span className="media-fallback">{name}<small>{status==='pending'?'압축 대기 중 · 원본 다운로드 가능 / Queued · Original available':status==='processing'?'영상·사진 압축 중 · 원본 다운로드 가능 / Processing · Original available':status==='failed'?'압축 실패 · 원본 다운로드 가능 / Processing failed · Original available':'미리보기 확인 중 · 원본 다운로드 가능 / Checking preview · Original available'}</small></span>;
  const placeholder=!loaded&&eager?<span className="book-media-loading" role="status"><span aria-hidden="true"/>{loadingLabel||'Loading photo…'}</span>:null;
  return mediaType==='video'?<>{placeholder}<video className={loaded?"memory-media is-loaded":"memory-media is-loading"} onLoadedData={()=>setLoaded(true)} src={src} controls={full} playsInline preload={eager?"auto":"metadata"} muted={!full} onClick={full?e=>e.stopPropagation():undefined} onError={()=>setFailed(true)} aria-label={name}/>{!full&&<span className="video-badge">▶ Video</span>}</>:<>{placeholder}<img ref={imageRef} className={loaded?"memory-media is-loaded":"memory-media is-loading"} onLoad={()=>setLoaded(true)} src={src} alt={name} loading={full||eager?'eager':'lazy'} onClick={full?e=>e.stopPropagation():undefined} onError={()=>setFailed(true)}/></>;
}
