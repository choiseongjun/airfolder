'use client';
/* eslint-disable @next/next/no-img-element -- Private generated images and local previews use data/object URLs. */
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './profile-character.css';

type State={active:string|null;draft:string|null;remaining:number;busy:boolean;configured:boolean};
const errors:Record<string,string>={
 DAILY_LIMIT:'오늘의 생성 3회를 모두 사용했어요. 내일 다시 만들어주세요.',
 EXPERIMENT_LIMIT:'오늘 테스트 생성 한도에 도달했어요.',
 GENERATION_BUSY:'이미 캐릭터를 만드는 중이에요. 잠시 후 다시 확인해 주세요.',
 AI_BILLING_REQUIRED:'이미지 생성 API의 결제·사용 한도를 확인해야 해요.',
 AI_ACCESS_REQUIRED:'이 API 키에 이미지 생성 권한이 없어요. 설정을 확인해 주세요.',
 AI_NOT_CONFIGURED:'이미지 생성 연결이 준비되지 않았어요.',
 INVALID_PHOTO:'사진을 읽을 수 없어요. JPG·PNG·WebP 사진으로 다시 골라주세요.',
 PHOTO_TOO_LARGE:'사진은 6MB 이하로 골라주세요.',
 NO_DRAFT:'미리보기가 만료되었거나 생성 중이에요. 다시 확인해 주세요.',
 TERMS_REQUIRED:'이용약관에 동의한 뒤 다시 시도해 주세요.',
};
async function call(options?:RequestInit):Promise<State>{
 const response=await fetch('/api/character-profile',{...options,cache:'no-store'});
 const data=await response.json();if(!response.ok)throw Error(data.error||'SERVER_ERROR');return data;
}
export default function ProfileCharacter({name}:{name:string}){
 const [state,setState]=useState<State|null>(null),[open,setOpen]=useState(false),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const input=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{let active=true;call().then(data=>{if(active)setState(data)}).catch(()=>{});return()=>{active=false}},[]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 useEffect(()=>{if(!open)return;const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy){setOpen(false);trigger.current?.focus()}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[open,busy]);
 function close(){if(busy)return;setOpen(false);trigger.current?.focus();}
 async function generate(){
  if(!file||!consent||busy)return;setBusy(true);setError('');setNotice('');
  try{const result=await call({method:'POST',headers:{'content-type':file.type,'x-photo-consent':'yes'},body:file});setState(current=>current?{...current,draft:result.draft}:current);setNotice('완성됐어요. 원형 프사에서 얼굴이 잘 보이는지 확인해 주세요.');}
  catch(e){setError(errors[(e as Error).message]||'캐릭터를 만들지 못했어요. 원래 프로필은 그대로예요.');}
  finally{try{setState(await call())}catch{}setBusy(false);}
 }
 async function apply(){
  setBusy(true);setError('');try{await call({method:'PATCH'});setState(await call());setNotice('프로필에 적용했어요.');setOpen(false);trigger.current?.focus();}
  catch(e){setError(errors[(e as Error).message]||'프로필에 적용하지 못했어요. 다시 시도해 주세요.');}finally{setBusy(false);}
 }
 async function reset(){
  setBusy(true);setError('');try{await call({method:'DELETE'});setState(await call());setNotice('기본 프로필로 돌아왔어요.');}catch{setError('프로필을 초기화하지 못했어요.');}finally{setBusy(false);}
 }
 const image=state?.active;
 return <><button ref={trigger} type="button" className="character-avatar" aria-label="캐릭터 프로필 만들기" disabled={!state} onClick={()=>{setError('');setOpen(true)}}>{image?<img src={image} alt={name+' 캐릭터 프로필'}/>:name.slice(0,1)}{state&&<span aria-hidden="true">✦</span>}</button>
 {state&&open&&createPortal(<div className="character-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="character-title" className="character-sheet">
 <header><div><small>나를 닮은 작은 캐릭터 · 실험실</small><h2 id="character-title">내 사진으로 캐릭터 만들기</h2></div><button autoFocus type="button" disabled={busy} aria-label="캐릭터 창 닫기" onClick={close}>✕</button></header>
 <p>셀카 한 장을 따뜻한 그림으로 바꿔요. 마음에 들면 내 프로필에 적용해 보세요.</p>
 <div className="character-comparison"><div>{preview?<img src={preview} alt="선택한 원본 사진"/>:<div className="character-placeholder">📷</div>}<small>내 사진</small></div><span aria-hidden="true">→</span><div>{state.draft||image?<img src={state.draft||image!} alt="원형 캐릭터 프로필 미리보기"/>:<div className="character-placeholder">✦</div>}<small>{state.draft?'새 캐릭터':'캐릭터 프사'}</small></div></div>
 <label className="character-file">셀카 찍기 / 사진 고르기<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event=>{const next=event.target.files?.[0];event.target.value='';if(!next)return;if(next.size>6*1024*1024||!['image/jpeg','image/png','image/webp'].includes(next.type)){setError('6MB 이하 JPG·PNG·WebP 사진을 골라주세요.');return;}setFile(next);setPreview(URL.createObjectURL(next));setConsent(false);setError('');setNotice('');}}/></label>
 <p className="character-hint">혼자 나온 밝은 정면 사진이 좋아요. 현재 프사는 ‘프로필에 적용’을 누르기 전까지 바뀌지 않아요.</p>
 <label className="character-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)}/><span>선택한 사진을 캐릭터 생성 목적으로 OpenAI에 전송하는 데 동의해요. 앱은 원본을 저장하지 않으며, 생성 결과만 보관해요. 미적용 미리보기는 24시간 동안 사용할 수 있어요.</span></label>
 <button className="character-primary" type="button" disabled={busy||state.busy||!file||!consent||state.remaining<=0||!state.configured} onClick={()=>void generate()}>{busy?'처리 중… 잠시 기다려주세요':state.busy?'캐릭터 생성 중':'캐릭터 1장 만들기'}</button>
 <p className="character-hint">오늘 남은 생성 {state.remaining}회 / 3회 · 생성 요청은 실패해도 한도에 포함돼요.</p>
 {!state.configured&&<p role="status">이미지 생성 연결이 준비되지 않았어요.</p>}
 {state.draft&&<button className="character-primary" type="button" disabled={busy||state.busy} onClick={()=>void apply()}>이 캐릭터를 프로필에 적용</button>}
 {(state.active||state.draft)&&<button className="character-reset" type="button" disabled={busy||state.busy} onClick={()=>void reset()}>캐릭터 삭제 · 기본 프로필로</button>}
 {error&&<p role="alert" className="character-error">{error}</p>}{notice&&<p role="status" className="character-notice">{notice}</p>}
 </section></div>,document.body)}</>;
}
