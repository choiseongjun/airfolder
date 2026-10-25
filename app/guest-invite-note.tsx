'use client';
import {useRef,useState} from 'react';
import {api} from '@/lib/client-api';
import {TERMS_VERSION} from '@/lib/policy';
import {joinedAlbumHref} from '@/lib/album-navigation';
import Consent from './growth/consent';
import type {MemoryItem} from './memories';
import Link from 'next/link';
export default function GuestInviteNote({token,ko,accepted,items,nickname,onNickname,preferredAlbum}:{token:string;ko:boolean;accepted:boolean;items:MemoryItem[];nickname:string;onNickname:(value:string)=>void;preferredAlbum?:string}){
 const [body,setBody]=useState(''),[photo,setPhoto]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(''),[albums,setAlbums]=useState<{id:string;name:string}[]>([]),[chosen,setChosen]=useState(preferredAlbum||'');
 const id=useRef<string|null>(null);
 const photos=[...new Map(items.flatMap(item=>item.kind==='photo'?[{id:item.id,src:item.src,body:item.body}]:(item.photos??[]).map(p=>({id:p.id,src:p.src,body:''}))).map(p=>[p.id,p])).values()];
 async function submit(){if(busy||!nickname.trim()||!body.trim()||(!accepted&&!consent))return;setBusy(true);setError('');try{
  const joined=await api<{folderId?:string;groupId?:string;albums:{id:string;name:string}[]}>('/api/join',{method:'POST',body:JSON.stringify({token,name:nickname.trim()})});
  const folder=joined.folderId||joined.albums.find(a=>a.id===chosen)?.id||(joined.albums.length===1?joined.albums[0].id:'');
  if(!folder){setAlbums(joined.albums);setError(ko?'메모를 남길 앨범을 선택해 주세요.':'Choose an album for your note.');return;}
  if(!accepted)await api('/api/policy',{method:'POST',body:JSON.stringify({version:TERMS_VERSION,accepted:true})});
  id.current??=crypto.randomUUID();
  await api(photo?'/api/discussion':'/api/rolling-paper',{method:'POST',body:JSON.stringify(photo?{id:id.current,kind:'photo',targetId:photo,action:'comment',body}:{id:id.current,folderId:folder,body,photoIds:[]})});
  setSaved(joinedAlbumHref(ko?'ko':'en',folder,joined.groupId,photo?undefined:'rolling'));setBody('');id.current=null;
 }catch{setError(ko?'메모를 저장하지 못했어요. 초대와 연결 상태를 확인하고 다시 시도해 주세요.':'Could not save your note. Check the invite and your connection, then retry.');}finally{setBusy(false);}}
 return <section className="growth-form"><h2>{ko?'너는 그날을 어떻게 기억해?':'How do you remember that day?'}</h2><p className="growth-note">{ko?'회원가입 없이 이름과 한마디면 돼요. 사진을 고르면 그 사진 뒷면에 남아요.':'No account needed. Add your name and a note. Choose a photo to write on its back.'}</p><label className="growth-field">{ko?'친구에게 보일 이름':'Your name'}<input required maxLength={30} value={nickname} disabled={busy} onChange={e=>onNickname(e.target.value)}/></label>{albums.length>0&&<select aria-label={ko?'앨범':'Album'} value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">{ko?'앨범 선택':'Choose album'}</option>{albums.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>}{photos.length>0&&<label className="growth-field">{ko?'어느 사진의 뒷면에 남길까요?':'Which photo is this memory about?'}<select value={photo} disabled={busy} onChange={e=>{setPhoto(e.target.value);id.current=null;}}><option value="">{ko?'앨범 전체에 한마디':'A note for the whole album'}</option>{photos.map((p,i)=><option key={p.id} value={p.id}>{i+1}. {p.body|| (ko?'사진':'Photo')}</option>)}</select></label>}{photo&&photos.find(p=>p.id===photo)?.src&&<img src={photos.find(p=>p.id===photo)!.src} alt={ko?'선택한 사진':'Selected photo'} style={{maxHeight:220,maxWidth:'100%',objectFit:'contain'}}/>}<label className="growth-field">{ko?'한마디':'Your note'}<textarea rows={3} maxLength={1000} required disabled={busy} value={body} onChange={e=>{setBody(e.target.value);id.current=null;}}/></label><small>{body.length}/1000</small>{!accepted&&<Consent ko={ko} checked={consent} onChange={setConsent}/>}<button type="button" className="growth-button" disabled={busy||!nickname.trim()||!body.trim()||(!accepted&&!consent)} onClick={()=>void submit()}>{busy?(ko?'저장 중…':'Saving…'):(ko?'한마디 남기기':'Leave my note')}</button>{error&&<p role="alert" className="growth-error">{error}</p>}{saved&&<p role="status" className="growth-success">{ko?'메모를 남겼어요. ':'Your note is saved. '}<Link href={saved}>{ko?'앨범에서 보기 →':'See it in the album →'}</Link></p>}</section>;
}
