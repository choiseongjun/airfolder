"use client";
import {useEffect,useState} from 'react';
import {api} from '@/lib/client-api';
import type {Locale} from './i18n';
import type {Group} from './groups';
export default function MoveAlbum({id,locale,onMoved}:{id:string;locale:Locale;onMoved:(group:string)=>Promise<void>}){
 const [groups,setGroups]=useState<Group[]>([]),[target,setTarget]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');const ko=locale==='ko';
 useEffect(()=>{let active=true;api<{groups:Group[]}>('/api/groups').then(d=>{if(active)setGroups(d.groups);}).catch(()=>{if(active)setError(ko?'그룹을 불러오지 못했어요.':'Could not load groups.');});return()=>{active=false;};},[ko]);
 async function move(){setBusy(true);setError('');try{await api('/api/folders',{method:'PATCH',body:JSON.stringify({id,groupId:target})});await onMoved(target);}catch(e){setError(e instanceof Error&&e.message==='SHARED_ALBUM_CANNOT_MOVE'?(ko?'다른 멤버나 다른 사람의 기록이 있는 앨범은 이동할 수 없어요. 새 그룹 앨범을 만들어 주세요.':'Albums with other members or their contributions cannot be moved. Create a new group album.'):(ko?'이동하지 못했어요. 다시 시도해 주세요.':'Could not move this album. Please retry.'));}finally{setBusy(false);}}
 if(!groups.length)return error?<p role="alert">{error}</p>:null;
 return <div className="group-confirm"><h3>{ko?'그룹으로 앨범 이동':'Move album into a group'}</h3><label>{ko?'함께할 그룹':'Choose a group'}<select value={target} onChange={e=>{setTarget(e.target.value);setConfirmed(false);}}><option value="">{ko?'그룹 선택':'Select a group'}</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><p>{ko?'비공개 사진은 그대로 유지됩니다. 이미 전체 공개한 사진·기록은 선택한 그룹 멤버에게 보이며, 기존 앨범 초대 링크는 만료됩니다. 혼자 쓰는 앨범만 이동할 수 있어요.':'Private photos stay private. Items already shared with all members become visible to the selected group. Existing album invitation links expire. Only solo albums can be moved.'}</p><label className="group-toggle"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{ko?'공개 범위 변경을 확인했어요':'I understand the sharing change'}</label><button className="primary-button" disabled={busy||!target||!confirmed} onClick={()=>void move()}>{ko?'앨범 이동':'Move album'}</button>{error&&<p role="alert">{error}</p>}</div>;
}
