'use client';
import {useEffect,useState} from 'react';
import {sendNative} from '@/lib/native-bridge';
import {api} from '@/lib/client-api';
type LinkItem={id:string;expires_at:string;count:number;access:"public"|"members"};
export default function ShareLinks({ids,ko,restricted=false,recordId}:{ids:string[];ko:boolean;restricted?:boolean;recordId?:string}){
 const [url,setUrl]=useState(''),[links,setLinks]=useState<LinkItem[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [access,setAccess]=useState<'public'|'members'>('members');
 const refresh=()=>api<{links:LinkItem[]}>('/api/share-links').then(d=>setLinks(d.links));
 useEffect(()=>{let active=true;api<{links:LinkItem[]}>('/api/share-links').then(d=>{if(active)setLinks(d.links);}).catch(()=>{if(active)setMessage(ko?'링크 목록을 불러오지 못했어요.':'Could not load links.');});return()=>{active=false;};},[ko]);
 async function create(){setBusy(true);setMessage('');try{
  const result=await api<{token:string}>('/api/share-links',{method:'POST',body:JSON.stringify({ids,access,recordId})});
  setUrl(`${window.location.origin}/s/${result.token}`);await refresh();
 }catch{setMessage(ko?'공개된 내 사진만 공유할 수 있어요. 선택 공개 사진은 초대 멤버 전용 링크를 사용해 주세요.':'Share only your published photos. Restricted photos require a members-only link.');}finally{setBusy(false);}}
 async function copy(){try{await navigator.clipboard.writeText(url);setMessage(ko?'링크를 복사했어요.':'Link copied.');}catch{setMessage(ko?'아래 주소를 길게 눌러 복사해 주세요.':'Select the address below to copy it.');}}
 return <><h2>{ko?'링크로 사진 보내기':'Share photos by link'}</h2><p>{access==='members'?(ko?'Google·Apple 로그인과 앨범 초대 수락이 모두 필요해요. 선택 공개 사진은 지정된 멤버에게만 보여요.':'Requires Google/Apple sign-in and accepted album membership. Restricted photos remain visible only to their selected recipients.'):(ko?'링크를 가진 누구나 로그인 없이 선택한 사진을 보고 다운로드할 수 있어요.':'Anyone with the link can view and download selected photos without signing in.')}</p><p>{ko?'7일 후 만료되며, 언제든 링크를 중지할 수 있어요. 비공개로 바꾼 사진은 보이지 않아요.':'Expires in 7 days. Revoke anytime. Private photos are never shown.'}</p>
 {ids.length>0&&!url&&<fieldset style={{display:'grid',gap:14,margin:'20px 0',border:'1px solid #ddd',borderRadius:12,padding:16}}><legend>{ko?'누가 볼 수 있나요?':'Who can access?'}</legend><label style={{display:'flex',gap:10}}><input type="radio" name="link-access" checked={access==='members'} onChange={()=>setAccess('members')}/>{ko?'로그인한 초대 멤버만':'Signed-in invited members only'}</label><label style={{display:'flex',gap:10}}><input type="radio" name="link-access" disabled={restricted} checked={access==='public'} onChange={()=>setAccess('public')}/>{ko?'링크가 있는 누구나':'Anyone with the link'}</label>{restricted&&<small>{ko?'선택 공개 사진은 초대 멤버 전용으로만 공유할 수 있어요.':'Selected-audience photos require members-only access.'}</small>}</fieldset>}
 {ids.length>0&&!url&&<button className="primary-button full" disabled={busy} onClick={create}>{ko?`${ids.length}개 사진·영상의 공유 링크 만들기`:`Create link for ${ids.length} photos & videos`}</button>}
 {url&&<div style={{display:'grid',gap:12}}><input aria-label={ko?'공유 링크':'Share link'} readOnly value={url} onFocus={e=>e.target.select()}/><button className="primary-button full" onClick={copy}>{ko?'링크 복사':'Copy link'}</button><button className="secondary-button full" onClick={async()=>{try{if(sendNative("SHARE_LINK",{url}))return;if(navigator.share)await navigator.share({title:'Memolumi',url});else await copy();}catch{/* Cancelled sharing. */}}}>{ko?'단톡방에 보내기':'Share to another app'}</button><a href={url} target="_blank" rel="noreferrer">{ko?'받는 사람 화면 보기':'Preview recipient view'} ↗</a></div>}
 {url&&['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname)&&<p className="info-box">{ko?'현재 주소는 이 컴퓨터에서만 열려요. 다른 사람에게 보내려면 외부에서 접속 가능한 서비스 주소가 필요해요.':'This address only opens on this computer. Use a publicly reachable service address before sending it to others.'}</p>}
 {message&&<p role="status">{message}</p>}
 <h3>{ko?'사용 중인 공유 링크':'Active share links'}</h3>{!links.length&&<p>{ko?'사용 중인 링크가 없어요.':'No active links.'}</p>}
 {links.map(link=><div key={link.id} style={{display:'flex',justifyContent:'space-between',gap:12,padding:'12px 0',borderBottom:'1px solid #e6e2d9'}}><span>{link.access==='members'?(ko?'초대 멤버 전용 · ':'Members only · '):(ko?'누구나 · ':'Anyone · ')}{link.count}{ko?'개 · 만료 ':' items · Expires '}{new Date(link.expires_at).toLocaleDateString(ko?'ko-KR':'en-US')}</span><button disabled={busy} onClick={async()=>{setBusy(true);try{await api('/api/share-links',{method:'DELETE',body:JSON.stringify({id:link.id})});setUrl('');await refresh();setMessage(ko?'공유 링크를 중지했어요.':'Link revoked.');}catch{setMessage(ko?'중지하지 못했어요. 다시 시도해 주세요.':'Could not revoke link. Try again.');}finally{setBusy(false);}}}>{ko?'링크 중지':'Revoke'}</button></div>)}
 </>;
}
