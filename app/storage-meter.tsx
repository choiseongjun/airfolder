"use client";
import {useEffect,useState} from 'react';
import {api} from '@/lib/client-api';
export default function StorageMeter({ko,revision}:{ko:boolean;revision:string}){
 const [usage,setUsage]=useState<{used:number;storage:number;remaining:number;serviceFull:boolean}|null>(null);
 useEffect(()=>{let active=true;api<typeof usage>('/api/media-limits').then(data=>{if(active)setUsage(data);}).catch(()=>{});return()=>{active=false;};},[revision]);
 return <div className="info-box" style={{display:'block'}}><strong>{ko?'기본 저장공간 500MB':'500 MB storage allowance'}</strong><p>{ko?'사진 20MB · 영상 50MB 이하. 원본과 압축본을 함께 계산하며, 처리 중에는 압축본 공간을 미리 확보해요.':'Photos up to 20 MB · Videos up to 50 MB. Originals and previews count toward storage. Space is reserved for pending previews.'}</p>{usage&&<><progress style={{width:'100%'}} max={usage.storage} value={Math.min(usage.used,usage.storage)}/><small>{Math.ceil(usage.used/1048576)} / 500 MB · {ko?'남은 용량':'Remaining'} {Math.floor(usage.remaining/1048576)} MB</small>{(usage.serviceFull||usage.remaining===0)&&<p role="status">{ko?'현재 저장 한도에 도달하여 새 업로드가 중단됩니다. 기존 파일은 볼 수 있어요.':'Storage capacity has been reached. New uploads are paused; existing files remain available.'}</p>}</>}</div>;
}
