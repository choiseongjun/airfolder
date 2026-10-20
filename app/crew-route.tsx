"use client";

import {useCallback,useEffect,useState} from 'react';
import {api} from '@/lib/client-api';
import {StitchBehind,StitchPhotoDrawer,StitchSubpage,type FeedData} from './home-feed';
import Groups from './groups';
import StitchSettings from './settings-screen';

type Screen='photos'|'behind'|'settings';
const GROUP_KEY='memonestia.feedGroup';
const route=(screen:'home'|Screen)=>screen==='home'?'/?lang=ko&home=1':`/crew/${screen}`;

export default function CrewRoutePage({screen}:{screen:Screen}){
 const [groupId,setGroupId]=useState<string|null>(null),[crewName,setCrewName]=useState('내 공간'),[crewMemberCount,setCrewMemberCount]=useState(1),[ready,setReady]=useState(false),[revision,setRevision]=useState(0);
 const loadCrew=useCallback(async(id:string|null|undefined)=>{
  const selected=id===undefined?undefined:id??'personal';
  const result=await api<FeedData>(`/api/feed${selected?`?group=${encodeURIComponent(selected)}`:''}`);
  setGroupId(result.crew.id);setCrewName(result.crew.name??'내 공간');setCrewMemberCount(result.crew.members.length);
  try{localStorage.setItem(GROUP_KEY,result.crew.id??'personal');}catch{}
  setReady(true);
 },[]);
 useEffect(()=>{let active=true;async function initial(){try{const saved=localStorage.getItem(GROUP_KEY);const id=saved===null?undefined:saved==='personal'?null:saved;const selected=id===undefined?undefined:id??'personal';const result=await api<FeedData>(`/api/feed${selected?`?group=${encodeURIComponent(selected)}`:''}`);if(!active)return;setGroupId(result.crew.id);setCrewName(result.crew.name??'내 공간');setCrewMemberCount(result.crew.members.length);localStorage.setItem(GROUP_KEY,result.crew.id??'personal');}catch{if(active)setCrewName('내 공간');}finally{if(active)setReady(true);}}void initial();return()=>{active=false;};},[]);
 const selectCrew=(id:string|null)=>{setGroupId(id);try{localStorage.setItem(GROUP_KEY,id??'personal');}catch{};void loadCrew(id);};
 const screenHref=(next:'home'|'photos'|'behind'|'settings')=>route(next);
 const createHref=`/?lang=ko&quick=1${groupId?`&group=${encodeURIComponent(groupId)}`:''}&returnTo=${encodeURIComponent(route(screen))}`;
 return <StitchSubpage title={screen==='photos'?'사진 서랍':screen==='behind'?'비하인드 롤링페이퍼':'크루 설정'} crewName={crewName} crewMemberCount={crewMemberCount} screen={screen} screenHref={screenHref} createHref={createHref}>
  {!ready?<div className="rounded-2xl bg-white p-8 text-center text-sm text-[#78675e]">크루 공간을 여는 중…</div>:screen==='photos'?<StitchPhotoDrawer key={`${groupId??'personal'}-${revision}`} groupId={groupId}/>:screen==='behind'?<StitchBehind key={`${groupId??'personal'}-${revision}`} groupId={groupId}/>:<StitchSettings groupId={groupId} crewName={crewName} onSelect={selectCrew} onChanged={async()=>{setRevision(value=>value+1);await loadCrew(groupId);}} revision={`${groupId??'personal'}-${revision}`}/>}
 </StitchSubpage>;
}
