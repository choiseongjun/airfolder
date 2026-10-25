"use client";
import {crewText} from '@/lib/crew-copy';

import {useCallback,useEffect,useRef,useState} from 'react';
import {CrewLocaleProvider} from './crew-locale';
import {crewHref} from '@/lib/crew-navigation';
import type {Locale} from './i18n';
import {trackClient} from '@/lib/growth-client';
import {api,initializeSession} from '@/lib/client-api';
import {StitchBehind,StitchPhotoDrawer,StitchSubpage,type FeedData} from './home-feed';
import FeedHeader from './feed-header';
import StitchSettings from './settings-screen';

type Screen='photos'|'behind'|'settings';
const GROUP_KEY='memonestia.feedGroup';

export default function CrewRoutePage({screen,locale='ko'}:{screen:Screen;locale?:Locale}){
 const ct=useCallback((key:string)=>crewText(locale,key),[locale]);
 useEffect(()=>{const q=new URLSearchParams(location.search);if(q.get('from')==='notification'){void trackClient('notification_opened',{},q.get('album')??undefined);q.delete('from');history.replaceState(history.state,'',location.pathname+'?'+q);}},[]);
 const loadSequence=useRef(0);
 const [groupId,setGroupId]=useState<string|null>(null),[crewName,setCrewName]=useState(ct("내 공간")),[data,setData]=useState<FeedData|null>(null),[ready,setReady]=useState(false),[revision,setRevision]=useState(0),[error,setError]=useState('');
 const loadCrew=useCallback(async(id:string|null|undefined)=>{
  const sequence=++loadSequence.current;
  const selected=id===undefined?undefined:id??'personal';
  const result=await api<FeedData>(`/api/feed${selected?`?group=${encodeURIComponent(selected)}`:''}`);
  if(sequence!==loadSequence.current)return;
  setGroupId(result.crew.id);setCrewName(result.crew.name??ct("내 공간"));setData(result);setError('');
  try{localStorage.setItem(GROUP_KEY,result.crew.id??'personal');}catch{}
  const url=new URL(window.location.href);url.searchParams.set('group',result.crew.id??'personal');window.history.replaceState(window.history.state,'',url);
  setReady(true);
 },[ct]);
 useEffect(()=>{let active=true;async function initial(){try{await initializeSession();let saved=new URLSearchParams(window.location.search).get('group');if(saved===null){try{saved=localStorage.getItem(GROUP_KEY);}catch{}}const album=new URLSearchParams(window.location.search).get('album');if(album&&!new URLSearchParams(window.location.search).has('group')){const info=await api<{rooms:{id:string;groupId:string|null}[]}>('/api/workspace');saved=info.rooms.find(room=>room.id===album)?.groupId??'personal';}const id=saved===null?undefined:saved==='personal'?null:saved;const selected=id===undefined?undefined:id??'personal';const result=await api<FeedData>(`/api/feed${selected?`?group=${encodeURIComponent(selected)}`:''}`);if(!active)return;setGroupId(result.crew.id);setCrewName(result.crew.name??ct("내 공간"));setData(result);try{localStorage.setItem(GROUP_KEY,result.crew.id??'personal');}catch{}}catch{if(active)setError(ct("공간을 불러오지 못했어요. 새로고침해서 다시 시도해 주세요."));}finally{if(active)setReady(true);}}void initial();return()=>{active=false;};},[ct]);
 const selectCrew=(id:string|null)=>{void loadCrew(id).catch(()=>setError(ct("공간을 바꾸지 못했어요. 다시 시도해 주세요.")));};
 const screenHref=(next:'home'|'photos'|'behind'|'settings')=>crewHref(next,locale,groupId??'personal');
 const createHref=`/?lang=${locale}&quick=1&group=${encodeURIComponent(groupId??'personal')}&returnTo=${encodeURIComponent(crewHref(screen,locale,groupId??'personal'))}`;
 return <CrewLocaleProvider locale={locale}><StitchSubpage header={data?<FeedHeader data={data} actions={{onSelectGroup:selectCrew,onCreateGroup:async(name,isPublic=false)=>{const result=await api<{id:string}>('/api/groups',{method:'POST',body:JSON.stringify({name,isPublic})});await loadCrew(result.id);},onJoinPublicGroup:async(id)=>{await api('/api/groups',{method:'PATCH',body:JSON.stringify({id,action:'joinPublic'})});await loadCrew(id);}}}/>:null} hasCrew={!!groupId} screen={screen} screenHref={screenHref} createHref={createHref}>
  {error&&<p role="alert" className="mb-4 rounded-2xl bg-white p-4 text-sm text-[#a33b2f]">{error}</p>}
  {!ready?<div className="rounded-2xl bg-white p-8 text-center text-sm text-[#78675e]">{ct("크루 공간을 여는 중…")}</div>:screen==='photos'?<StitchPhotoDrawer key={`${groupId??'personal'}-${revision}`} groupId={groupId}/>:screen==='behind'?<StitchBehind key={`${groupId??'personal'}-${revision}`} groupId={groupId}/>:<StitchSettings groupId={groupId} crewName={crewName} onSelect={selectCrew} onChanged={async()=>{setRevision(value=>value+1);await loadCrew(groupId);}} revision={`${groupId??'personal'}-${revision}`}/>}
 </StitchSubpage></CrewLocaleProvider>;
}
