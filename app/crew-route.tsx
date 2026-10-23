"use client";

import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from '@/lib/client-api';
import {StitchBehind,StitchPhotoDrawer,StitchSubpage,type FeedData} from './home-feed';
import FeedHeader from './feed-header';
import StitchSettings from './settings-screen';

type Screen='photos'|'behind'|'settings';
const GROUP_KEY='memonestia.feedGroup';
const route=(screen:'home'|Screen,groupId:string|null)=>`${screen==='home'? '/?lang=ko&home=1&' : `/crew/${screen}?`}group=${encodeURIComponent(groupId??'personal')}`;

export default function CrewRoutePage({screen}:{screen:Screen}){
 const loadSequence=useRef(0);
 const [groupId,setGroupId]=useState<string|null>(null),[crewName,setCrewName]=useState('내 공간'),[data,setData]=useState<FeedData|null>(null),[ready,setReady]=useState(false),[revision,setRevision]=useState(0),[error,setError]=useState('');
 const loadCrew=useCallback(async(id:string|null|undefined)=>{
  const sequence=++loadSequence.current;
  const selected=id===undefined?undefined:id??'personal';
  const result=await api<FeedData>(`/api/feed${selected?`?group=${encodeURIComponent(selected)}`:''}`);
  if(sequence!==loadSequence.current)return;
  setGroupId(result.crew.id);setCrewName(result.crew.name??'내 공간');setData(result);setError('');
  try{localStorage.setItem(GROUP_KEY,result.crew.id??'personal');}catch{}
  const url=new URL(window.location.href);url.searchParams.set('group',result.crew.id??'personal');window.history.replaceState(window.history.state,'',url);
  setReady(true);
 },[]);
 useEffect(()=>{let active=true;async function initial(){try{let saved=new URLSearchParams(window.location.search).get('group');if(saved===null){try{saved=localStorage.getItem(GROUP_KEY);}catch{}}const id=saved===null?undefined:saved==='personal'?null:saved;const selected=id===undefined?undefined:id??'personal';const result=await api<FeedData>(`/api/feed${selected?`?group=${encodeURIComponent(selected)}`:''}`);if(!active)return;setGroupId(result.crew.id);setCrewName(result.crew.name??'내 공간');setData(result);try{localStorage.setItem(GROUP_KEY,result.crew.id??'personal');}catch{}}catch{if(active)setError('공간을 불러오지 못했어요. 새로고침해서 다시 시도해 주세요.');}finally{if(active)setReady(true);}}void initial();return()=>{active=false;};},[]);
 const selectCrew=(id:string|null)=>{void loadCrew(id).catch(()=>setError('공간을 바꾸지 못했어요. 다시 시도해 주세요.'));};
 const screenHref=(next:'home'|'photos'|'behind'|'settings')=>route(next,groupId);
 const createHref=`/?lang=ko&quick=1&group=${encodeURIComponent(groupId??'personal')}&returnTo=${encodeURIComponent(route(screen,groupId))}`;
 return <StitchSubpage header={data?<FeedHeader data={data} actions={{onSelectGroup:selectCrew,onCreateGroup:async(name,isPublic=false)=>{const result=await api<{id:string}>('/api/groups',{method:'POST',body:JSON.stringify({name,isPublic})});await loadCrew(result.id);},onJoinPublicGroup:async(id)=>{await api('/api/groups',{method:'PATCH',body:JSON.stringify({id,action:'joinPublic'})});await loadCrew(id);}}}/>:null} hasCrew={!!groupId} screen={screen} screenHref={screenHref} createHref={createHref}>
  {error&&<p role="alert" className="mb-4 rounded-2xl bg-white p-4 text-sm text-[#a33b2f]">{error}</p>}
  {!ready?<div className="rounded-2xl bg-white p-8 text-center text-sm text-[#78675e]">크루 공간을 여는 중…</div>:screen==='photos'?<StitchPhotoDrawer key={`${groupId??'personal'}-${revision}`} groupId={groupId}/>:screen==='behind'?<StitchBehind key={`${groupId??'personal'}-${revision}`} groupId={groupId}/>:<StitchSettings groupId={groupId} crewName={crewName} onSelect={selectCrew} onChanged={async()=>{setRevision(value=>value+1);await loadCrew(groupId);}} revision={`${groupId??'personal'}-${revision}`}/>}
 </StitchSubpage>;
}
