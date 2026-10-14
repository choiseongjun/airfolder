"use client";
import {useEffect,useState} from 'react';
import {api} from '@/lib/client-api';
export default function MemberPicker({folderIds,value,onChange,ko}:{folderIds:string[];value:string[];onChange:(ids:string[])=>void;ko:boolean}) {
  const [members,setMembers]=useState<{id:string;name:string;mine:boolean}[]|null>(null),[error,setError]=useState(false);
  const key=[...new Set(folderIds)].sort().join(',');
  useEffect(()=>{
    let active=true;
    Promise.all(key.split(',').filter(Boolean).map(folderId=>api<{members:{id:string;name:string;mine:boolean}[]}>(`/api/members?folderId=${folderId}`))).then(groups=>{
      if(active)setMembers((groups[0]?.members||[]).filter(m=>!m.mine&&groups.every(g=>g.members.some(n=>n.id===m.id))));
    }).catch(()=>{if(active)setError(true);});
    return()=>{active=false;};
  },[key]);
  return <fieldset className="member-picker"><legend>{ko?'공유할 멤버':'Choose members'}</legend>{error?<p role="alert">{ko?'멤버를 불러오지 못했습니다. 창을 닫고 다시 시도하세요.':'Could not load members. Close and retry.'}</p>:members===null?<p>{ko?'불러오는 중…':'Loading…'}</p>:!members.length?<p>{ko?'선택한 모든 폴더에 함께 참여한 다른 멤버가 없습니다. 먼저 초대하세요.':'No other members belong to every selected folder. Invite them first.'}</p>:members.map(m=><label key={m.id}><input type="checkbox" checked={value.includes(m.id)} onChange={e=>onChange(e.target.checked?[...value,m.id]:value.filter(id=>id!==m.id))}/>{m.name}<small> · {m.id.slice(0,6)}</small></label>)}<small>{ko?'작성자는 항상 볼 수 있습니다. 선택하지 않은 멤버는 원본과 댓글도 볼 수 없습니다.':'The author keeps access. Other members cannot view the originals or comments.'}</small></fieldset>;
}
