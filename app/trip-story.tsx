'use client';
import {useCrewText,useCrewLocale} from './crew-locale';
/* eslint-disable @next/next/no-img-element -- Private photos and optional profile characters. */
import {useEffect,useRef,useState,useSyncExternalStore,type FormEvent,type CSSProperties} from 'react';
import Link from 'next/link';
import {Camera,Check,ChevronLeft,ChevronRight,Copy,Download,Plus,RefreshCw,Share2,X} from 'lucide-react';
import {api,initializeSession} from '@/lib/client-api';
import {trackClient} from '@/lib/growth-client';
import {type CharacterAnimal} from '@/lib/character-style';
import {STORY_QUESTION,saveStory,storyInvite,type StoryEntry,type StoryFile,type StorySaveState,type TripStory} from '@/lib/trip-story';
import {exportStoryCard} from '@/lib/trip-story-export';
import {TERMS_VERSION} from '@/lib/policy';
import {joinedAlbumHref} from '@/lib/album-navigation';
import {sansStack} from './stitch-kit';
import './trip-story.css';
import AnimalPicker from './animal-picker';
import AnimalMascot from './animal-mascot';
import {characterScene} from '@/lib/character-scene';
import {mascotName} from '@/lib/character-style';
const originSubscribe=()=>()=>{};
const clientOrigin=()=>location.origin;
const serverOrigin=()=>'';

function Avatar({entry}:{entry:StoryEntry}){
 const ct=useCrewText();
const [failed,setFailed]=useState(false);return <span className="trip-avatar">{entry.avatar&&!failed?<img src={entry.avatar} alt={ct("{0}의 캐릭터",entry.name)} onError={()=>setFailed(true)}/>:<AnimalMascot animal={entry.animal}/>}</span>;}
function MemoryScene({entry}:{entry:StoryEntry}){
 const ct=useCrewText();

 const scene=characterScene(entry.animal);
 return <blockquote className={`trip-memory-scene scene-${scene.id}`} style={{'--scene-paper':scene.background,'--scene-ink':scene.ink} as CSSProperties}><div className="trip-scene-top"><span>{ct(scene.label)}</span><span aria-hidden="true">{scene.symbol}</span></div><p className="trip-scene-words">{entry.body||ct("사진에 담기지 않은 마음도, 여기 남겨주세요.")}</p><div className="trip-scene-bottom"><div className="trip-scene-stage"><span className="trip-scene-window" aria-hidden="true"/><span className="trip-scene-floor" aria-hidden="true"/><Avatar entry={entry}/></div><cite><strong>{ct("{0}의 기억",entry.name||ct("나"))}</strong><small>{ct("{0}와 함께 간직하는 중",ct(mascotName(entry.animal)))}</small></cite></div></blockquote>;
}
export function StoryCards({title,entries,folderId,actions=false}:{title:string;entries:StoryEntry[];folderId?:string;actions?:boolean}){
 const ct=useCrewText();
 const locale=useCrewLocale();
 const [page,setPage]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const cards=entries.length>1?[entries.slice(0,3),...entries.map(e=>[e])]:[entries],index=Math.min(page,cards.length-1),shown=cards[index];
 const prepared=useRef<{key:string;file:File}|null>(null),[preparedKey,setPreparedKey]=useState('');
 const key=JSON.stringify([title,index,shown,locale]);
 function measure(event:'trip_story_exported'|'trip_story_share_opened'){if(folderId)void trackClient(event,{flow:'trip_story'},folderId);}
 function download(file:File){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);measure('trip_story_exported');}
 async function exportCard(){setBusy(true);setError('');try{download(await exportStoryCard(title,shown,index,cards.length,locale));}catch{setError(ct("사진을 불러오지 못해 저장을 멈췄어요. 새로고침 후 다시 시도해 주세요."));}finally{setBusy(false);}}
 async function share(){setError('');if(prepared.current?.key===key){const file=prepared.current.file;if(navigator.canShare?.({files:[file]})){try{const promise=navigator.share({files:[file],title,text:ct("{0} · 각자가 기억하는 같은 여행",title)});measure('trip_story_share_opened');await promise;}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setError(ct("공유 창을 열지 못했어요. 이미지 저장으로 가져갈 수 있어요."));}}else download(file);return;}
  setBusy(true);try{prepared.current={key,file:await exportStoryCard(title,shown,index,cards.length,locale)};setPreparedKey(key);}catch{setError(ct("공유 이미지를 준비하지 못했어요. 다시 시도해 주세요."));}finally{setBusy(false);}}
 return <section className="trip-result" aria-label={ct("함께 만든 여행편")}>
  {entries.length>1&&<div className="trip-perspectives" role="group" aria-label={ct("누구의 기억을 펼칠까요")}><button type="button" aria-pressed={index===0} onClick={()=>setPage(0)}><span className="trip-together">{ct("우리")}</span><span>{ct("함께 보기")}</span></button>{entries.map((e,i)=><button type="button" key={e.id} aria-pressed={index===i+1} onClick={()=>setPage(i+1)}><Avatar entry={e}/><span>{ct("{0}의 기억",e.name)}</span></button>)}</div>}
  <article className="trip-card"><header><span>SAME TRIP, DIFFERENT MEMORIES</span><h2>{title||ct("우리의 여행")}</h2><p>{entries.length>1&&index===0?ct("{0}명의 시선으로 완성하는 중",new Set(entries.map(e=>e.personId)).size):ct("내가 기억하는 그날")}</p></header>
   {shown.length?shown.map(e=><section className="trip-memory" key={e.id}><div className="trip-photos">{e.photos.map(p=><img key={p.id} src={p.src} alt={ct("{0}의 기억이 담긴 여행 사진",e.name||ct('나'))}/>)}</div><MemoryScene entry={e}/></section>):<div className="trip-empty-photo"><Camera/><p>{ct("아직 펼쳐진 기억이 없어요.")}<br/>{ct("사진 한 장으로 우리의 이야기를 시작해요.")}</p></div>}
   {entries.length>3&&index===0&&<p className="trip-hint trip-more">{ct("첫 세 장을 펼쳤어요. 위의 캐릭터를 누르면 다른 기억도 읽을 수 있어요.")}</p>}
   <footer>{ct("memonestia · 함께 만든 여행편")} <span>{index+1}/{cards.length}</span></footer>
  </article>
  {cards.length>1&&<nav className="trip-pages" aria-label={ct("여행편 카드 넘기기")}><button type="button" aria-label={ct("이전 카드")} disabled={index===0} onClick={()=>setPage(index-1)}><ChevronLeft size={18}/></button><span>{index===0?ct("우리 모두의 표지"):ct("{0}의 기억",shown[0].name)} · {index+1}/{cards.length}</span><button type="button" aria-label={ct("다음 카드")} disabled={index===cards.length-1} onClick={()=>setPage(index+1)}><ChevronRight size={18}/></button></nav>}
  {actions&&<><div className="trip-actions"><button type="button" disabled={busy||!entries.length} onClick={()=>void exportCard()}><Download size={17}/>{busy?ct("이미지 준비 중…"):ct("이 카드 저장")}</button><button type="button" disabled={busy||!entries.length} onClick={()=>void share()}><Share2 size={17}/>{preparedKey===key?ct("공유 앱 열기"):ct("공유 이미지 준비")}</button></div><small className="trip-hint">{ct("사진·이름·한마디가 이미지에 포함돼요. 긴 한마디는 저장 이미지에서 줄여 표시됩니다.")}</small></>}
  {error&&<p role="alert" className="trip-error">{error}</p>}
 </section>;
}

function StoryComposer({folderId,title,host=false,beforeSave,onSaved}:{folderId?:string;title:string;host?:boolean;beforeSave?:()=>Promise<string>;onSaved:(folder:string,token?:string)=>void}){
 const ct=useCrewText();
 const locale=useCrewLocale();
 const prompts=[{label:ct("오래 남은 순간"),hint:ct("여행이 끝나고도 자꾸 생각나는 장면이 있어…")},{label:ct("고마웠던 마음"),hint:ct("그날 네가 해준 작은 일이 아직 기억나…")},{label:ct("우리만 아는 이야기"),hint:ct("사진에는 안 보이지만, 사실 이때 우리…")}];
 const [prompt,setPrompt]=useState(0);
 const [name,setName]=useState(''),[body,setBody]=useState(''),[animal,setAnimal]=useState<CharacterAnimal>('cat'),[useProfile,setUseProfile]=useState(false),[profile,setProfile]=useState<string|null>(null);
 const [files,setFiles]=useState<StoryFile[]>([]),[consent,setConsent]=useState(false),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[tripName,setTripName]=useState(title),[titleLocked,setTitleLocked]=useState(false);
 const progress=useRef<StorySaveState|null>(null),attempt=useRef(''),staged=useRef<StoryFile[]>([]),working=useRef(false),previewed=useRef(false);
 useEffect(()=>{staged.current=files;},[files]);useEffect(()=>()=>staged.current.forEach(f=>URL.revokeObjectURL(f.src)),[]);
 useEffect(()=>{let active=true;if(host&&!attempt.current){attempt.current=crypto.randomUUID();void trackClient('trip_story_viewed',{flow:'trip_story',attempt_id:attempt.current});}void initializeSession().then(async()=>{const [policy,character]=await Promise.all([api<{accepted:boolean}>('/api/policy'),api<{active:string|null}>('/api/character-profile').catch(()=>null)]);if(active){setAccepted(policy.accepted);setProfile(character?.active||null);}}).catch(()=>{});return()=>{active=false};},[host]);
 useEffect(()=>{if(!files.length)return;const warn=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[files.length]);
 function choose(list:FileList|null){if(!list||locked||busy)return;const limit=host?3:1;const valid=Array.from(list).filter(f=>f.size>0&&f.size<=20*1024**2&&['image/jpeg','image/png','image/webp'].includes(f.type));const next=valid.slice(0,limit);files.forEach(f=>URL.revokeObjectURL(f.src));setFiles(next.map(file=>({id:crypto.randomUUID(),file,src:URL.createObjectURL(file)})));setError(valid.length!==list.length||valid.length>limit?ct("JPG·PNG·WebP 사진을 {0}장까지, 장당 20MB 이하로 골라주세요.",limit):'');if(next.length&&!previewed.current){previewed.current=true;attempt.current||=crypto.randomUUID();void trackClient('trip_story_previewed',{flow:'trip_story',attempt_id:attempt.current});}}
 async function submit(e:FormEvent){e.preventDefault();if(working.current||!files.length||!name.trim()||!body.trim()||(!accepted&&!consent))return;working.current=true;setBusy(true);setError('');setStatus(ct("사진과 한마디를 저장하고 있어요…"));
  try{await initializeSession();if(!accepted){await api('/api/policy',{method:'POST',body:JSON.stringify({version:TERMS_VERSION,accepted:true})});setAccepted(true);}
   const destination=progress.current?.folderId||folderId||await beforeSave?.();attempt.current||=crypto.randomUUID();progress.current||={folderId:destination,creationId:crypto.randomUUID(),noteId:crypto.randomUUID(),uploaded:new Set()};setLocked(true);
   const result=await saveStory(api,progress.current,{title:tripName.trim()||ct("우리의 여행"),name:name.trim(),body:body.trim(),animal,useProfile,files,attemptId:attempt.current},host);
   setFiles([]);files.forEach(f=>URL.revokeObjectURL(f.src));onSaved(result.folderId,result.token);
  }catch(cause){const code=cause instanceof Error?cause.message:'';if(code==='INVALID_PHOTOS'&&progress.current)progress.current.noteAttempted=false;if(!progress.current?.noteAttempted)setLocked(false);if(code==='NO_ACTIVE_CHARACTER')setUseProfile(false);setError(code==='NO_ACTIVE_CHARACTER'?ct("프로필 캐릭터가 없어 기본 동물 캐릭터로 바꿨어요. 이어서 저장해 주세요."):code.includes('STORAGE')?ct("저장 공간이 부족해요. 선택한 사진은 유지했어요. 잠시 후 다시 시도해 주세요."):ct("저장하지 못했어요. 선택한 사진과 진행 상황은 유지했어요. 다시 누르면 이어서 저장합니다."));}
  finally{working.current=false;setBusy(false);setStatus('');setTitleLocked(Boolean(progress.current?.folderId));}
 }
 const draft:StoryEntry={id:'preview',personId:'preview',name:name.trim()||ct("나"),body:body.trim(),animal,avatar:useProfile?profile:null,mine:true,photos:files.map(f=>({id:f.id,src:f.src}))};
 return <form className="trip-compose" onSubmit={submit}>
  <fieldset disabled={busy||locked}>
   {host&&<label>{ct("우리 여행 이름")}<input disabled={titleLocked} maxLength={80} value={tripName} onChange={e=>setTripName(e.target.value)} placeholder={ct("예: 부산에서 보낸 주말")}/></label>}
   <label className="trip-file"><Camera size={21}/><strong>{host?ct("여행 사진 1~3장 고르기"):ct("내가 찍은 우리 사진 한 장")}</strong><span>{files.length?ct("{0}장 선택 · 다시 고르기",files.length):ct("JPG·PNG·WebP · 장당 20MB까지")}</span><input type="file" aria-label={host?ct("여행편 시작 사진"):ct("여행편에 보탤 사진")} accept="image/jpeg,image/png,image/webp" multiple={host} onChange={e=>{choose(e.target.files);e.target.value='';}}/></label>
   <div className="trip-inputs"><label>{ct("친구들이 알아볼 내 이름")}<input required maxLength={30} value={name} onChange={e=>setName(e.target.value)} placeholder={ct("예: 지우")}/></label><div className="trip-writing"><span className="trip-eyebrow">{ct("사진에 담기지 않은 마음")}</span><p>{ct("어디서부터 쓸지 막막하다면")}</p><div className="trip-prompts" role="group" aria-label={ct("기억을 떠올릴 질문")}>{prompts.map((p,i)=><button type="button" key={p.label} aria-pressed={prompt===i} onClick={()=>setPrompt(i)}>{p.label}</button>)}</div><label>{ct(STORY_QUESTION)}<textarea required maxLength={280} rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder={prompts[prompt].hint}/></label><small>{ct("잘 쓴 문장보다, 너다운 한마디면 충분해요.")} <span>{body.length}/280</span></small></div></div>
   <div><span className="trip-eyebrow">{ct("내 기억 옆에 함께할 작은 나")}</span><AnimalPicker value={useProfile?null:animal} onChange={value=>{setAnimal(value);setUseProfile(false)}}/></div>
   {profile&&<label className="trip-check"><input type="checkbox" checked={useProfile} onChange={e=>setUseProfile(e.target.checked)}/>{ct("내 프로필 캐릭터를 이 여행편·공유 이미지에 넣기")}</label>}
  </fieldset>
  {files.length>0&&<div className="trip-live"><span className="trip-eyebrow">{host?ct("내 사진으로 만든 첫 장"):ct("내가 보탤 장면 미리보기")}</span><StoryCards title={tripName} entries={[draft]}/><small className="trip-hint">{ct("아직 저장 전이에요. 아래 버튼을 누르면 사진과 한마디가 앨범에 공유됩니다.")}</small></div>}
  {!accepted&&<label className="trip-check"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span>{locale==='en'?<>I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a> and have read the <a href="/privacy" target="_blank" rel="noreferrer">Privacy Notice</a>.</>:<><a href="/terms" target="_blank" rel="noreferrer">이용약관</a>에 동의하고 <a href="/privacy" target="_blank" rel="noreferrer">개인정보 안내</a>를 확인했어요.</>}</span></label>}
  <p className="trip-hint">{ct("사진과 한마디는 앨범 멤버·초대 링크를 가진 친구가 볼 수 있어요. 다른 사람의 사진은 허락받고 올려주세요.")}</p>
  <button className="trip-primary" disabled={busy||!files.length||!name.trim()||!body.trim()||(!accepted&&!consent)}>{busy?status:locked?ct("이어서 저장하기"):host?ct("첫 장 저장하고 친구 부르기"):ct("내 사진과 기억 보태기")}<Plus size={18}/></button>
  {locked&&!busy&&error&&<small className="trip-hint">{ct("재시도는 처음 선택한 사진·이름·한마디를 그대로 저장해요.")}</small>}
  {error&&<p role="alert" className="trip-error">{error}</p>}
 </form>;
}

function InviteBox({folderId,title,initialToken}:{folderId:string;title:string;initialToken?:string}){
 const ct=useCrewText();
 const locale=useCrewLocale();
 const [token,setToken]=useState(initialToken||''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const origin=useSyncExternalStore(originSubscribe,clientOrigin,serverOrigin),link=token&&origin?`${origin}/join/${token}?lang=${locale}&album=${encodeURIComponent(folderId)}&request=story`:'';
 async function prepare(){setBusy(true);setNotice('');try{const result=await api<{token:string}>('/api/invites',{method:'POST',body:JSON.stringify({folderId,flow:'trip_story'})});setToken(result.token);}catch{setNotice(ct("초대 링크를 만들지 못했어요. 다시 시도해 주세요."));}finally{setBusy(false);}}
 async function copy(){try{await navigator.clipboard.writeText(storyInvite(title,link,locale));setNotice(ct("복사했어요. 함께 간 친구에게 보내주세요."));void trackClient('trip_story_invite_copied',{flow:'trip_story'},folderId);}catch{setNotice(ct("아래 메시지를 길게 눌러 복사해 주세요."));}}
 return <aside className="trip-invite"><span className="trip-eyebrow">{ct("아직 듣지 못한 너의 이야기")}</span><h3>{ct("“너는 그날을 어떻게 기억해?”")}</h3><p>{ct("같은 사진을 보고도 떠오르는 순간은 다르니까.")}<br/>{ct("함께했던 친구에게 그날의 기억을 물어보세요.")}</p>{link?<><textarea aria-label={ct("친구에게 보낼 여행편 초대")} readOnly rows={5} value={storyInvite(title,link,locale)}/><button className="trip-primary" type="button" onClick={()=>void copy()}><Copy size={17}/>{ct("친구에게 보낼 편지 복사")}</button><a href={link} target="_blank" rel="noreferrer">{ct("친구가 보게 될 화면 확인 ↗")}</a></>:<button type="button" className="trip-primary" disabled={busy} onClick={()=>void prepare()}>{busy?ct("초대 준비 중…"):ct("친구에게 보낼 링크 만들기")}</button>}<small>{ct("초대 링크는 7일간 유효해요. 함께 간 친구에게만 보내주세요.")}</small>{notice&&<p role="status">{notice}</p>}</aside>;
}

export function TripStoryAlbum({folderId,initialToken}:{folderId:string;initialToken?:string}){
 const ct=useCrewText();
 const locale=useCrewLocale();
 const [data,setData]=useState<TripStory|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[compose,setCompose]=useState(false),[confirm,setConfirm]=useState('');
 useEffect(()=>{let active=true;api<TripStory>('/api/trip-story?folderId='+folderId).then(d=>{if(active){setData(d);setError('')}}).catch(()=>{if(active)setError(ct("여행편을 불러오지 못했어요. 다시 확인해 주세요."))});return()=>{active=false}},[folderId,revision,ct]);
 async function remove(id:string){try{await api('/api/trip-story',{method:'DELETE',body:JSON.stringify({id,folderId})});setConfirm('');setRevision(n=>n+1);}catch{setError(ct("삭제하지 못했어요. 다시 시도해 주세요."));}}
 return <section className="trip-story" style={{fontFamily:sansStack}}><div className="trip-status"><span>{data?ct("{0}명의 기억 · {1}개의 한마디",data.people,data.total):ct("여행편을 펼치고 있어요…")}</span><button type="button" aria-label={ct("친구가 보탠 기억 새로고침")} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16}/></button></div>{error&&<p role="alert" className="trip-error">{error}</p>}
  {data&&<><StoryCards title={data.title} entries={data.entries} folderId={folderId} actions/>{data.canInvite&&<InviteBox folderId={folderId} title={data.title} initialToken={initialToken}/>}
   <button type="button" className="trip-secondary" onClick={()=>setCompose(v=>!v)}>{compose?<X size={16}/>:<Plus size={16}/>} {compose?ct("접기"):ct("내 사진과 기억 보태기")}</button>
   {compose&&<StoryComposer folderId={folderId} title={data.title} onSaved={()=>{setCompose(false);setRevision(n=>n+1)}}/>}
   <details className="trip-all"><summary>{ct("친구들이 남긴 한마디 전체 보기")}</summary>{data.entries.map(e=><article key={e.id}><div><Avatar entry={e}/><strong>{e.name}</strong></div><p>{e.body}</p>{e.mine&&<button type="button" onClick={()=>setConfirm(e.id)}>{ct("내 한마디 삭제")}</button>}{confirm===e.id&&<div><p>{ct("이 한마디와 카드를 삭제해요. 원본 사진은 앨범에 남습니다.")}</p><button type="button" onClick={()=>void remove(e.id)}>{ct("삭제하기")}</button><button type="button" onClick={()=>setConfirm('')}>{ct("취소")}</button></div>}</article>)}</details>
   {data.total>data.entries.length&&<p className="trip-hint">{ct("현재 여행편에는 먼저 남긴 기억 100개까지 표시돼요.")}</p>}
   <Link className="trip-next" href={`/make?occasion=travel&lang=${locale}`}>{ct("다음 여행도 한 편으로 남기기 →")}</Link>
  </>}
 </section>;
}
export default function TripStoryStart(){
 const ct=useCrewText();
 const locale=useCrewLocale();
 const [result,setResult]=useState<{folder:string;token?:string}|null>(null);
 return <section className="trip-story" style={{fontFamily:sansStack}}><header className="trip-heading"><span className="trip-eyebrow">{ct("사진 너머, 우리의 이야기")}</span><h1>{result?<>{ct("우리 여행의 첫 장,")}<br/>{ct("친구들이 이어줄 차례.")}</>:<>{ct("너는 그날을")}<br/>{ct("어떻게 기억해?")}</>}</h1><p>{result?ct("친구의 사진과 한마디가 들어오면 새 카드가 더해져요."):ct("사진은 내가 찍었지만, 그날의 기억은 우리 모두에게 있으니까. 사진 한 장과 마음 한 줄로 시작해요.")}</p></header>
  {result?<><p className="trip-saved" role="status"><Check size={18}/>{ct("첫 장을 저장했어요.")}</p><TripStoryAlbum folderId={result.folder} initialToken={result.token}/><Link className="trip-next" href={joinedAlbumHref(locale,result.folder)}>{ct("사진 서랍에서 다시 열기 →")}</Link></>:<><ol className="trip-steps"><li><b>01</b>  {ct("내 사진과 기억")}</li><li><b>02</b>  {ct("친구의 한 장")}</li><li><b>03</b>  {ct("우리의 여행편")}</li></ol><StoryComposer title="" host onSaved={(folder,token)=>setResult({folder,token})}/><p className="trip-hint">{ct("친구도 앱 설치·회원가입 없이 보탤 수 있어요. 저장 전에는 사진이 전송되지 않습니다.")}</p></>}
 </section>;
}
export function TripStoryGuest({token,folderId}:{token:string;folderId?:string}){
 const ct=useCrewText();
 const locale=useCrewLocale();
 const [story,setStory]=useState<TripStory|null>(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[saved,setSaved]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;(async()=>{try{await initializeSession();const preview=await api<{name:string;folderId?:string}>('/api/join/preview',{method:'POST',body:JSON.stringify({token,album:folderId})});const target=folderId||preview.folderId;if(!target)throw Error('INVITE_EXPIRED');const result=await api<TripStory>(`/api/trip-story?folderId=${encodeURIComponent(target)}&token=${encodeURIComponent(token)}`);if(active){setStory(result);setReady(true);setError('')}}catch{if(active)setError(ct("초대를 확인하지 못했어요. 만료된 링크라면 친구에게 새 링크를 요청해 주세요."));}})();return()=>{active=false}},[token,folderId,retry,ct]);
 async function join(){if(!story)throw Error('INVITE_EXPIRED');const result=await api<{folderId?:string;albums:{id:string}[]}>('/api/join',{method:'POST',body:JSON.stringify({token})});if(result.folderId!==story.folderId&&!result.albums.some(a=>a.id===story.folderId))throw Error('FOLDER_NOT_FOUND');return story.folderId;}
 return <main className="trip-guest-shell"><nav><Link href={`/?lang=${locale}&home=1`}>memonestia.</Link><Link href={`/crew/photos?lang=${locale}`}>{ct("내 사진 서랍")}</Link></nav><section className="trip-story" style={{fontFamily:sansStack}}>
  {saved?<><header className="trip-heading"><span className="trip-eyebrow">{ct("네 기억까지, 한 편에")}</span><h1>{ct("우리 여행에")}<br/>{ct("네 장면이 더해졌어.")}</h1><p role="status">{ct("사진과 한마디를 보탰어요.")}</p></header><TripStoryAlbum folderId={saved}/></>:<><header className="trip-heading"><span className="trip-eyebrow">{ct("친구가 네 기억을 기다려요")}</span><h1>{story?.title||ct("우리의 여행")}<br/>{ct("너는 어떻게 기억해?")}</h1><p>{ct("네가 찍은 우리 사진 한 장과")}<br/>{ct("사진에는 담기지 않은 네 이야기를 들려줘.")}</p></header>{ready&&story&&<><details className="trip-peek" open><summary>{ct("친구가 먼저 만든 여행편")}</summary><StoryCards title={story.title} entries={story.entries}/></details><Link className="trip-secondary" href={`/join/${token}?lang=${locale}&request=birthday&album=${encodeURIComponent(story.folderId)}`}>{ct("사진 없이 한마디만 남기기 · Leave just a note →")}</Link><StoryComposer title={story.title} beforeSave={join} onSaved={setSaved}/></>}{!ready&&!error&&<p role="status">{ct("친구가 만든 첫 장을 확인하고 있어요…")}</p>}</>}
  {error&&<p role="alert" className="trip-error">{error}<button type="button" onClick={()=>setRetry(n=>n+1)}>{ct("다시 확인")}</button></p>}
 </section></main>;
}
