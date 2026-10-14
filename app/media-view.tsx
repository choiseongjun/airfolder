"use client";
/* eslint-disable @next/next/no-img-element */
import {useEffect,useState} from 'react';
export default function MediaView({src,name,mediaType,full=false}:{src:string;name:string;mediaType?:string;full?:boolean}){
  const [failed,setFailed]=useState(false);
  const [status,setStatus]=useState('');
  useEffect(()=>{
    if(!failed || !src.startsWith('/api/photos/'))return;
    let active=true;const controller=new AbortController();
    const check=async()=>{try{const response=await fetch(src+(src.includes('?')?'&':'?')+'status=1',{signal:controller.signal});if(!response.ok)return;const data=await response.json();if(active){setStatus(data.status);if(data.status==='ready')setFailed(false);}}catch{}};
    void check();const timer=setInterval(check,15000);return()=>{active=false;controller.abort();clearInterval(timer);};
  },[failed,src]);
  if(failed)return <span className="media-fallback">{name}<small>{status==='pending'?'압축 대기 중 · 원본 다운로드 가능 / Queued · Original available':status==='processing'?'영상·사진 압축 중 · 원본 다운로드 가능 / Processing · Original available':status==='failed'?'압축 실패 · 원본 다운로드 가능 / Processing failed · Original available':'미리보기 확인 중 · 원본 다운로드 가능 / Checking preview · Original available'}</small></span>;
  return mediaType==='video'?<><video src={src} controls={full} playsInline preload="metadata" muted={!full} onClick={full?e=>e.stopPropagation():undefined} onError={()=>setFailed(true)} aria-label={name}/>{!full&&<span className="video-badge">▶ Video</span>}</>:<img src={src} alt={name} loading={full?'eager':'lazy'} onClick={full?e=>e.stopPropagation():undefined} onError={()=>setFailed(true)}/>;
}
