'use client';
import {useEffect,useState} from 'react';
import {Users,ChevronDown,ChevronUp,RefreshCw} from 'lucide-react';
import {api} from '@/lib/client-api';
import './members-panel.css';
type Member={id:string;name:string;mine:boolean;owner:boolean;registered:boolean;joined_at:string};
type Data={members:Member[];invites:{expires_at:string}[]};
export default function MembersPanel({groupId,folderId,ko}:{groupId?:string;folderId?:string;ko:boolean}){
 const [data,setData]=useState<Data|null>(null),[expanded,setExpanded]=useState(false),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;const load=()=>api<Data>(groupId?`/api/groups?id=${groupId}`:`/api/members?folderId=${folderId}`).then(d=>{if(active){setData(d);setError(false);}}).catch(()=>{if(active)setError(true);});void load();const timer=setInterval(load,30000);return()=>{active=false;clearInterval(timer);};},[groupId,folderId,revision]);
 const text=(a:string,b:string)=>ko?a:b;
 return <section className="members-panel" aria-label={text('함께하는 멤버','People in this space')}><div className="members-panel-heading"><div><Users size={18}/><h2>{text('함께하는 멤버','People in this space')} {data&&<span>{data.members.length}</span>}</h2></div><button aria-label={text('멤버 새로고침','Refresh members')} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16}/></button></div>
 {error?<p role="alert">{text('멤버를 불러오지 못했어요. 새로고침해 주세요.','Could not load members. Please refresh.')}</p>:!data?<p>{text('멤버를 확인하고 있어요…','Loading members…')}</p>:<><ul className="member-roster">{data.members.slice(0,expanded?undefined:4).map((m,i)=><li key={m.id}><span className={`member-avatar member-tone-${i%4}`} aria-hidden="true">{m.name.slice(0,1)}</span><div><strong>{m.name}{m.mine&&<small>{text('나','You')}</small>}</strong><span>{m.owner?text(groupId?'그룹장':'관리자','Owner'):text('참여 완료','Joined')} · {m.registered?text('로그인 계정','Signed-in account'):text('게스트','Guest')}</span>{expanded&&<time dateTime={m.joined_at}>{text('참여일 ','Joined ')}{new Date(m.joined_at).toLocaleDateString(ko?'ko-KR':'en-US')}</time>}</div><span className="member-joined">{text('참여 중','Active')}</span></li>)}</ul><button className="members-expand" onClick={()=>setExpanded(v=>!v)}>{expanded?text('간단히 보기','Show less'):text(`멤버 ${data.members.length}명 모두 보기 · 참여일`,`View all ${data.members.length} members · join dates`)}{expanded?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</button>
 {data.members.some(m=>m.mine&&m.owner)&&<p className="member-invite-status">{text('사용 중인 초대 링크','Active invitation links')} {data.invites.length}{data.invites.length>0&&` · ${text('만료','Expires')} ${new Date(data.invites[0].expires_at).toLocaleDateString(ko?'ko-KR':'en-US')}`}</p>}
 <p className="member-privacy-note">{text('초대 링크를 받은 사람은 참여를 수락하면 목록에 표시돼요. 게스트는 로그인해야 멤버 전용 공유 링크를 볼 수 있어요.','Invitees appear here after joining. Guests must sign in to open members-only share links.')}</p></>}
 </section>;
}
