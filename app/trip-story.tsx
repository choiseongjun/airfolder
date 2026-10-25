'use client';
/* eslint-disable @next/next/no-img-element -- Private photos and optional profile characters. */
import {useEffect,useRef,useState,useSyncExternalStore,type FormEvent} from 'react';
import Link from 'next/link';
import {Camera,Check,ChevronLeft,ChevronRight,Copy,Download,Plus,RefreshCw,Share2,X} from 'lucide-react';
import {api,initializeSession} from '@/lib/client-api';
import {trackClient} from '@/lib/growth-client';
import {characterAnimals,type CharacterAnimal} from '@/lib/character-style';
import {STORY_QUESTION,saveStory,storyInvite,type StoryEntry,type StoryFile,type StorySaveState,type TripStory} from '@/lib/trip-story';
import {exportStoryCard} from '@/lib/trip-story-export';
import {TERMS_VERSION} from '@/lib/policy';
import {joinedAlbumHref} from '@/lib/album-navigation';
import {sansStack} from './stitch-kit';
import './trip-story.css';
const originSubscribe=()=>()=>{};
const clientOrigin=()=>location.origin;
const serverOrigin=()=>'';

function Avatar({entry}:{entry:StoryEntry}){const [failed,setFailed]=useState(false);return <span className="trip-avatar">{entry.avatar&&!failed?<img src={entry.avatar} alt={`${entry.name}의 캐릭터`} onError={()=>setFailed(true)}/>:characterAnimals.find(a=>a.id===entry.animal)?.emoji||'🐱'}</span>;}
export function StoryCards({title,entries,folderId,actions=false}:{title:string;entries:StoryEntry[];folderId?:string;actions?:boolean}){
 const [page,setPage]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const cards=entries.length>1?[entries.slice(0,3),...entries.map(e=>[e])]:[entries],index=Math.min(page,cards.length-1),shown=cards[index],photos=shown.flatMap(e=>e.photos).slice(0,4);
 const prepared=useRef<{key:string;file:File}|null>(null),[preparedKey,setPreparedKey]=useState('');
 const key=JSON.stringify([title,index,shown]);
 function measure(event:'trip_story_exported'|'trip_story_share_opened'){if(folderId)void trackClient(event,{flow:'trip_story'},folderId);}
 function download(file:File){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);measure('trip_story_exported');}
 async function exportCard(){setBusy(true);setError('');try{download(await exportStoryCard(title,shown,index,cards.length));}catch{setError('사진을 불러오지 못해 저장을 멈췄어요. 새로고침 후 다시 시도해 주세요.');}finally{setBusy(false);}}
 async function share(){setError('');if(prepared.current?.key===key){const file=prepared.current.file;if(navigator.canShare?.({files:[file]})){try{const promise=navigator.share({files:[file],title,text:`${title} · 각자가 기억하는 같은 여행`});measure('trip_story_share_opened');await promise;}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setError('공유 창을 열지 못했어요. 이미지 저장으로 가져갈 수 있어요.');}}else download(file);return;}
  setBusy(true);try{prepared.current={key,file:await exportStoryCard(title,shown,index,cards.length)};setPreparedKey(key);}catch{setError('공유 이미지를 준비하지 못했어요. 다시 시도해 주세요.');}finally{setBusy(false);}}
 return <section className="trip-result" aria-label="함께 만든 여행편">
  <article className="trip-card"><header><span>SAME TRIP, DIFFERENT MEMORIES</span><h2>{title||'우리의 여행'}</h2><p>{entries.length>1&&index===0?`${new Set(entries.map(e=>e.personId)).size}명의 시선으로 완성하는 중`:'내가 기억하는 그날'}</p></header>
   <div className="trip-photos">{photos.length?photos.map(p=><img key={p.id} src={p.src} alt="함께 남긴 여행 사진"/>):<div className="trip-empty-photo"><Camera/><p>우리 사진을 넣으면<br/>여행편이 시작돼요.</p></div>}</div>
   <p className="trip-question">{STORY_QUESTION}</p>
   {shown.map(e=><blockquote key={e.id} className="trip-quote"><div><Avatar entry={e}/><cite>{e.name||'나'}</cite></div><p>{e.body||'사진만으로는 알 수 없는 그날의 이야기를 적어주세요.'}</p></blockquote>)}
   <footer>memonestia · 함께 만든 여행편 <span>{index+1}/{cards.length}</span></footer>
  </article>
  {cards.length>1&&<nav className="trip-pages" aria-label="여행편 카드 넘기기"><button type="button" aria-label="이전 카드" disabled={index===0} onClick={()=>setPage(index-1)}><ChevronLeft size={18}/></button><span>{index===0?'우리 모두의 표지':`${shown[0].name}의 기억`} · {index+1}/{cards.length}</span><button type="button" aria-label="다음 카드" disabled={index===cards.length-1} onClick={()=>setPage(index+1)}><ChevronRight size={18}/></button></nav>}
  {actions&&<><div className="trip-actions"><button type="button" disabled={busy||!entries.length} onClick={()=>void exportCard()}><Download size={17}/>{busy?'이미지 준비 중…':'이 카드 저장'}</button><button type="button" disabled={busy||!entries.length} onClick={()=>void share()}><Share2 size={17}/>{preparedKey===key?'공유 앱 열기':'공유 이미지 준비'}</button></div><small className="trip-hint">사진·이름·한마디가 이미지에 포함돼요. 긴 한마디는 저장 이미지에서 줄여 표시됩니다.</small></>}
  {error&&<p role="alert" className="trip-error">{error}</p>}
 </section>;
}

function StoryComposer({folderId,title,host=false,beforeSave,onSaved}:{folderId?:string;title:string;host?:boolean;beforeSave?:()=>Promise<string>;onSaved:(folder:string,token?:string)=>void}){
 const [name,setName]=useState(''),[body,setBody]=useState(''),[animal,setAnimal]=useState<CharacterAnimal>('cat'),[useProfile,setUseProfile]=useState(false),[profile,setProfile]=useState<string|null>(null);
 const [files,setFiles]=useState<StoryFile[]>([]),[consent,setConsent]=useState(false),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[tripName,setTripName]=useState(title),[titleLocked,setTitleLocked]=useState(false);
 const progress=useRef<StorySaveState|null>(null),attempt=useRef(''),staged=useRef<StoryFile[]>([]),working=useRef(false),previewed=useRef(false);
 useEffect(()=>{staged.current=files;},[files]);useEffect(()=>()=>staged.current.forEach(f=>URL.revokeObjectURL(f.src)),[]);
 useEffect(()=>{let active=true;if(host&&!attempt.current){attempt.current=crypto.randomUUID();void trackClient('trip_story_viewed',{flow:'trip_story',attempt_id:attempt.current});}void initializeSession().then(async()=>{const [policy,character]=await Promise.all([api<{accepted:boolean}>('/api/policy'),api<{active:string|null}>('/api/character-profile').catch(()=>null)]);if(active){setAccepted(policy.accepted);setProfile(character?.active||null);}}).catch(()=>{});return()=>{active=false};},[host]);
 useEffect(()=>{if(!files.length)return;const warn=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[files.length]);
 function choose(list:FileList|null){if(!list||locked||busy)return;const limit=host?3:1;const valid=Array.from(list).filter(f=>f.size>0&&f.size<=20*1024**2&&['image/jpeg','image/png','image/webp'].includes(f.type));const next=valid.slice(0,limit);files.forEach(f=>URL.revokeObjectURL(f.src));setFiles(next.map(file=>({id:crypto.randomUUID(),file,src:URL.createObjectURL(file)})));setError(valid.length!==list.length||valid.length>limit?`JPG·PNG·WebP 사진을 ${limit}장까지, 장당 20MB 이하로 골라주세요.`:'');if(next.length&&!previewed.current){previewed.current=true;attempt.current||=crypto.randomUUID();void trackClient('trip_story_previewed',{flow:'trip_story',attempt_id:attempt.current});}}
 async function submit(e:FormEvent){e.preventDefault();if(working.current||!files.length||!name.trim()||!body.trim()||(!accepted&&!consent))return;working.current=true;setBusy(true);setError('');setStatus('사진과 한마디를 저장하고 있어요…');
  try{await initializeSession();if(!accepted){await api('/api/policy',{method:'POST',body:JSON.stringify({version:TERMS_VERSION,accepted:true})});setAccepted(true);}
   const destination=progress.current?.folderId||folderId||await beforeSave?.();attempt.current||=crypto.randomUUID();progress.current||={folderId:destination,creationId:crypto.randomUUID(),noteId:crypto.randomUUID(),uploaded:new Set()};setLocked(true);
   const result=await saveStory(api,progress.current,{title:tripName.trim()||'우리의 여행',name:name.trim(),body:body.trim(),animal,useProfile,files,attemptId:attempt.current},host);
   setFiles([]);files.forEach(f=>URL.revokeObjectURL(f.src));onSaved(result.folderId,result.token);
  }catch(cause){const code=cause instanceof Error?cause.message:'';if(code==='INVALID_PHOTOS'&&progress.current)progress.current.noteAttempted=false;if(!progress.current?.noteAttempted)setLocked(false);if(code==='NO_ACTIVE_CHARACTER')setUseProfile(false);setError(code==='NO_ACTIVE_CHARACTER'?'프로필 캐릭터가 없어 기본 동물 캐릭터로 바꿨어요. 이어서 저장해 주세요.':code.includes('STORAGE')?'저장 공간이 부족해요. 선택한 사진은 유지했어요. 잠시 후 다시 시도해 주세요.':'저장하지 못했어요. 선택한 사진과 진행 상황은 유지했어요. 다시 누르면 이어서 저장합니다.');}
  finally{working.current=false;setBusy(false);setStatus('');setTitleLocked(Boolean(progress.current?.folderId));}
 }
 const draft:StoryEntry={id:'preview',personId:'preview',name:name.trim()||'나',body:body.trim(),animal,avatar:useProfile?profile:null,mine:true,photos:files.map(f=>({id:f.id,src:f.src}))};
 return <form className="trip-compose" onSubmit={submit}>
  <fieldset disabled={busy||locked}>
   {host&&<label>우리 여행 이름<input disabled={titleLocked} maxLength={80} value={tripName} onChange={e=>setTripName(e.target.value)} placeholder="예: 부산에서 보낸 주말"/></label>}
   <label className="trip-file"><Camera size={21}/><strong>{host?'여행 사진 1~3장 고르기':'내가 찍은 우리 사진 한 장'}</strong><span>{files.length?`${files.length}장 선택 · 다시 고르기`:'JPG·PNG·WebP · 장당 20MB까지'}</span><input type="file" aria-label={host?'여행편 시작 사진':'여행편에 보탤 사진'} accept="image/jpeg,image/png,image/webp" multiple={host} onChange={e=>{choose(e.target.files);e.target.value='';}}/></label>
   <div className="trip-inputs"><label>친구들이 알아볼 내 이름<input required maxLength={30} value={name} onChange={e=>setName(e.target.value)} placeholder="예: 지우"/></label><label>{STORY_QUESTION}<textarea required maxLength={280} rows={3} value={body} onChange={e=>setBody(e.target.value)} placeholder="길 잘못 들어서 우연히 찾은 바다가 제일 좋았잖아 ㅋㅋ"/></label></div>
   <div className="trip-animal"><span>내 이야기를 소개할 캐릭터</span><div role="group" aria-label="여행편 캐릭터">{characterAnimals.map(a=><button key={a.id} type="button" aria-label={a.label} aria-pressed={!useProfile&&a.id===animal} onClick={()=>{setAnimal(a.id);setUseProfile(false)}}>{a.emoji}</button>)}</div></div>
   {profile&&<label className="trip-check"><input type="checkbox" checked={useProfile} onChange={e=>setUseProfile(e.target.checked)}/>내 프로필 캐릭터를 이 여행편·공유 이미지에 넣기</label>}
  </fieldset>
  {files.length>0&&<div className="trip-live"><span className="trip-eyebrow">{host?'내 사진으로 만든 첫 장':'내가 보탤 장면 미리보기'}</span><StoryCards title={tripName} entries={[draft]}/><small className="trip-hint">아직 저장 전이에요. 아래 버튼을 누르면 사진과 한마디가 앨범에 공유됩니다.</small></div>}
  {!accepted&&<label className="trip-check"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span><a href="/terms" target="_blank" rel="noreferrer">이용약관</a>에 동의하고 <a href="/privacy" target="_blank" rel="noreferrer">개인정보 안내</a>를 확인했어요.</span></label>}
  <p className="trip-hint">사진과 한마디는 앨범 멤버·초대 링크를 가진 친구가 볼 수 있어요. 다른 사람의 사진은 허락받고 올려주세요.</p>
  <button className="trip-primary" disabled={busy||!files.length||!name.trim()||!body.trim()||(!accepted&&!consent)}>{busy?status:locked?'이어서 저장하기':host?'첫 장 저장하고 친구 부르기':'내 사진과 기억 보태기'}<Plus size={18}/></button>
  {locked&&!busy&&error&&<small className="trip-hint">재시도는 처음 선택한 사진·이름·한마디를 그대로 저장해요.</small>}
  {error&&<p role="alert" className="trip-error">{error}</p>}
 </form>;
}

function InviteBox({folderId,title,initialToken}:{folderId:string;title:string;initialToken?:string}){
 const [token,setToken]=useState(initialToken||''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const origin=useSyncExternalStore(originSubscribe,clientOrigin,serverOrigin),link=token&&origin?`${origin}/join/${token}?lang=ko&album=${encodeURIComponent(folderId)}&request=story`:'';
 async function prepare(){setBusy(true);setNotice('');try{const result=await api<{token:string}>('/api/invites',{method:'POST',body:JSON.stringify({folderId,flow:'trip_story'})});setToken(result.token);}catch{setNotice('초대 링크를 만들지 못했어요. 다시 시도해 주세요.');}finally{setBusy(false);}}
 async function copy(){try{await navigator.clipboard.writeText(storyInvite(title,link));setNotice('복사했어요. 함께 간 친구에게 보내주세요.');void trackClient('trip_story_invite_copied',{flow:'trip_story'},folderId);}catch{setNotice('아래 메시지를 길게 눌러 복사해 주세요.');}}
 return <aside className="trip-invite"><span className="trip-eyebrow">친구의 시선이 들어올 차례</span><h3>“너는 그날 뭐가 제일 웃겼어?”</h3><p>사진 한 장과 기억 하나를 부탁해 보세요.<br/>친구가 보태면 이 여행편에 새 카드가 생겨요.</p>{link?<><textarea aria-label="친구에게 보낼 여행편 초대" readOnly rows={5} value={storyInvite(title,link)}/><button className="trip-primary" type="button" onClick={()=>void copy()}><Copy size={17}/>초대 메시지 복사</button><a href={link} target="_blank" rel="noreferrer">친구가 보게 될 화면 확인 ↗</a></>:<button type="button" className="trip-primary" disabled={busy} onClick={()=>void prepare()}>{busy?'초대 준비 중…':'친구에게 보낼 링크 만들기'}</button>}<small>초대 링크는 7일간 유효해요. 함께 간 친구에게만 보내주세요.</small>{notice&&<p role="status">{notice}</p>}</aside>;
}

export function TripStoryAlbum({folderId,initialToken}:{folderId:string;initialToken?:string}){
 const [data,setData]=useState<TripStory|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[compose,setCompose]=useState(false),[confirm,setConfirm]=useState('');
 useEffect(()=>{let active=true;api<TripStory>('/api/trip-story?folderId='+folderId).then(d=>{if(active){setData(d);setError('')}}).catch(()=>{if(active)setError('여행편을 불러오지 못했어요. 다시 확인해 주세요.')});return()=>{active=false}},[folderId,revision]);
 async function remove(id:string){try{await api('/api/trip-story',{method:'DELETE',body:JSON.stringify({id,folderId})});setConfirm('');setRevision(n=>n+1);}catch{setError('삭제하지 못했어요. 다시 시도해 주세요.');}}
 return <section className="trip-story" style={{fontFamily:sansStack}}><div className="trip-status"><span>{data?`${data.people}명의 기억 · ${data.total}개의 한마디`:'여행편을 펼치고 있어요…'}</span><button type="button" aria-label="친구가 보탠 기억 새로고침" onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16}/></button></div>{error&&<p role="alert" className="trip-error">{error}</p>}
  {data&&<><StoryCards title={data.title} entries={data.entries} folderId={folderId} actions/>{data.canInvite&&<InviteBox folderId={folderId} title={data.title} initialToken={initialToken}/>}
   <button type="button" className="trip-secondary" onClick={()=>setCompose(v=>!v)}>{compose?<X size={16}/>:<Plus size={16}/>} {compose?'접기':'내 사진과 기억 보태기'}</button>
   {compose&&<StoryComposer folderId={folderId} title={data.title} onSaved={()=>{setCompose(false);setRevision(n=>n+1)}}/>}
   <details className="trip-all"><summary>친구들이 남긴 한마디 전체 보기</summary>{data.entries.map(e=><article key={e.id}><div><Avatar entry={e}/><strong>{e.name}</strong></div><p>{e.body}</p>{e.mine&&<button type="button" onClick={()=>setConfirm(e.id)}>내 한마디 삭제</button>}{confirm===e.id&&<div><p>이 한마디와 카드를 삭제해요. 원본 사진은 앨범에 남습니다.</p><button type="button" onClick={()=>void remove(e.id)}>삭제하기</button><button type="button" onClick={()=>setConfirm('')}>취소</button></div>}</article>)}</details>
   {data.total>data.entries.length&&<p className="trip-hint">현재 여행편에는 먼저 남긴 기억 100개까지 표시돼요.</p>}
   <Link className="trip-next" href="/make?occasion=travel">다음 여행도 한 편으로 남기기 →</Link>
  </>}
 </section>;
}
export default function TripStoryStart(){
 const [result,setResult]=useState<{folder:string;token?:string}|null>(null);
 return <section className="trip-story" style={{fontFamily:sansStack}}><header className="trip-heading"><span className="trip-eyebrow">각자가 기억하는 같은 여행</span><h1>{result?<>우리 여행의 첫 장,<br/>친구들이 이어줄 차례.</>:<>같이 다녀왔지만,<br/>기억은 다 다르니까.</>}</h1><p>{result?'친구의 사진과 한마디가 들어오면 새 카드가 더해져요.':'사진 3장과 내 한마디로 시작해요. 친구의 시선까지 모이면, 우리만의 여행편이 돼요.'}</p></header>
  {result?<><p className="trip-saved" role="status"><Check size={18}/>첫 장을 저장했어요.</p><TripStoryAlbum folderId={result.folder} initialToken={result.token}/><Link className="trip-next" href={joinedAlbumHref('ko',result.folder)}>사진 서랍에서 다시 열기 →</Link></>:<><ol className="trip-steps"><li><b>01</b> 내 사진과 기억</li><li><b>02</b> 친구의 한 장</li><li><b>03</b> 우리의 여행편</li></ol><StoryComposer title="" host onSaved={(folder,token)=>setResult({folder,token})}/><p className="trip-hint">친구도 앱 설치·회원가입 없이 보탤 수 있어요. 저장 전에는 사진이 전송되지 않습니다.</p></>}
 </section>;
}
export function TripStoryGuest({token,folderId}:{token:string;folderId?:string}){
 const [story,setStory]=useState<TripStory|null>(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[saved,setSaved]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;(async()=>{try{await initializeSession();const preview=await api<{name:string;folderId?:string}>('/api/join/preview',{method:'POST',body:JSON.stringify({token,album:folderId})});const target=folderId||preview.folderId;if(!target)throw Error('INVITE_EXPIRED');const result=await api<TripStory>(`/api/trip-story?folderId=${encodeURIComponent(target)}&token=${encodeURIComponent(token)}`);if(active){setStory(result);setReady(true);setError('')}}catch{if(active)setError('초대를 확인하지 못했어요. 만료된 링크라면 친구에게 새 링크를 요청해 주세요.');}})();return()=>{active=false}},[token,folderId,retry]);
 async function join(){if(!story)throw Error('INVITE_EXPIRED');const result=await api<{folderId?:string;albums:{id:string}[]}>('/api/join',{method:'POST',body:JSON.stringify({token})});if(result.folderId!==story.folderId&&!result.albums.some(a=>a.id===story.folderId))throw Error('FOLDER_NOT_FOUND');return story.folderId;}
 return <main className="trip-guest-shell"><nav><Link href="/?lang=ko&home=1">memonestia.</Link><Link href="/crew/photos">내 사진 서랍</Link></nav><section className="trip-story" style={{fontFamily:sansStack}}>
  {saved?<><header className="trip-heading"><span className="trip-eyebrow">네 기억까지, 한 편에</span><h1>우리 여행에<br/>네 장면이 더해졌어.</h1><p role="status">사진과 한마디를 보탰어요.</p></header><TripStoryAlbum folderId={saved}/></>:<><header className="trip-heading"><span className="trip-eyebrow">친구가 네 기억을 기다려요</span><h1>{story?.title||'우리의 여행'}<br/>너는 어떻게 기억해?</h1><p>네가 찍은 우리 사진 한 장과<br/>가장 웃겼던 순간 하나를 보태줘.</p></header>{ready&&story&&<><details className="trip-peek" open><summary>친구가 먼저 만든 여행편</summary><StoryCards title={story.title} entries={story.entries}/></details><StoryComposer title={story.title} beforeSave={join} onSaved={setSaved}/></>}{!ready&&!error&&<p role="status">친구가 만든 첫 장을 확인하고 있어요…</p>}</>}
  {error&&<p role="alert" className="trip-error">{error}<button type="button" onClick={()=>setRetry(n=>n+1)}>다시 확인</button></p>}
 </section></main>;
}
