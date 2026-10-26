'use client';
/* eslint-disable @next/next/no-img-element -- Local photo and generated page object URLs. */
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useIntroPhoto} from '@/lib/intro-photo';
import {browserImage} from '@/lib/browser-image';
import {bookZip,renderKeepsakeBook} from '@/lib/keepsake-book';
import {useAlbumFunnel} from '@/lib/use-album-funnel';
import {api,initializeSession} from '@/lib/client-api';
import {TERMS_VERSION} from '@/lib/policy';
import type {Locale} from './i18n';
import './keepsake-book.css';

type Shot={id:string;file:File;url:string};
export default function KeepsakeBook({locale}:{locale:Locale}){
 const ko=locale==='ko',t=(a:string,b:string)=>ko?a:b;
 const [shots,setShots]=useState<Shot[]>([]),[title,setTitle]=useState(''),[companions,setCompanions]=useState(''),[story,setStory]=useState('');
 const [pages,setPages]=useState<{file:File;url:string}[]>([]),[page,setPage]=useState(0),[step,setStep]=useState<'photos'|'words'|'result'>('photos');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[consent,setConsent]=useState(false),[saved,setSaved]=useState(''),[status,setStatus]=useState(''),[locked,setLocked]=useState(false);
 const input=useRef<HTMLInputElement>(null),urls=useRef(new Set<string>()),working=useRef(false),root=useRef<HTMLElement>(null);
 const progress=useRef<{folder:string;record:string;ids:string[];uploaded:Set<string>;created:boolean}|null>(null);
 const {measure,metadata}=useAlbumFunnel('album-keepsake');
 const urlFor=(blob:Blob)=>{const url=URL.createObjectURL(blob);urls.current.add(url);return url;};
 const release=(url:string)=>{URL.revokeObjectURL(url);urls.current.delete(url);};
 useEffect(()=>{const owned=urls.current;return()=>{owned.forEach(URL.revokeObjectURL);owned.clear();};},[]);
 useEffect(()=>{if(!shots.length||saved)return;const warn=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[shots.length,saved]);
 function move(next:typeof step){setStep(next);root.current?.scrollTo({top:0});}
 function pick(){measure('album_picker_opened');input.current?.click();}
 async function select(files:File[]){
  if(working.current||locked)return;working.current=true;setBusy(true);setError('');
  const next:Shot[]=[];let failed=false;
  try{for(const file of files){
   if(shots.length+next.length>=8){failed=true;break;}
   if(!file.size||file.size>20*1024**2||shots.reduce((n,s)=>n+s.file.size,0)+next.reduce((n,s)=>n+s.file.size,0)+file.size>80*1024**2||(!/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.type)&&!/\.hei[cf]$/i.test(file.name))){failed=true;continue;}
   let url='';try{url=urlFor(await browserImage(file));await new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject(Error('INVALID_IMAGE'));img.src=url;});next.push({id:crypto.randomUUID(),file,url});}catch{if(url)release(url);failed=true;}
  }setShots(old=>[...old,...next]);if(next.length)measure('album_photos_selected',{photo_count:shots.length+next.length});
  if(failed){measure('album_photo_failed',{reason:'format'});setError(t('일부 사진을 넣지 못했어요. 최대 8장, 장당 20MB·전체 80MB까지 지원해요. JPG·PNG·WebP·HEIC·AVIF 사진을 골라주세요.','Some photos could not be added. Choose up to 8 JPG, PNG, WebP, HEIC or AVIF photos, 20 MB each and 80 MB total.'));}
  }finally{setBusy(false);working.current=false;}
 }
 useIntroPhoto(file=>{void select([file]);});
 async function create(){
  if(working.current||!shots.length||!story.trim())return;working.current=true;setBusy(true);setError('');
  try{const result=await renderKeepsakeBook({title:title.trim()||t('오래 간직하고 싶은 날','A day worth keeping'),companions:companions.trim(),story:story.trim(),photos:shots.map(s=>s.url),locale});pages.forEach(p=>release(p.url));setPages(result.map(file=>({file,url:urlFor(file)})));setPage(0);move('result');measure('album_preview_ready',{photo_count:shots.length});}
  catch{setError(t('추억책을 만들지 못했어요. 사진은 그대로 있어요. 다시 시도해 주세요.','Could not make your book. Your photos are kept. Please try again.'));}finally{setBusy(false);working.current=false;}
 }
 async function download(){if(working.current)return;working.current=true;setBusy(true);setError('');try{const blob=await bookZip(pages.map(p=>p.file)),url=urlFor(blob),a=document.createElement('a');a.href=url;a.download='memonestia-memory-book.zip';a.click();setTimeout(()=>release(url),60000);measure('album_exported');}catch{setError(t('다운로드를 준비하지 못했어요. 다시 시도해 주세요.','Could not prepare the download. Please retry.'));}finally{working.current=false;setBusy(false);}}
 async function save(){
  if(working.current||!consent||saved)return;working.current=true;setBusy(true);setError('');setLocked(true);measure('album_save_started',{photo_count:shots.length});
  try{
   await initializeSession();await api('/api/policy',{method:'POST',body:JSON.stringify({version:TERMS_VERSION,accepted:true})});
   progress.current||={folder:crypto.randomUUID(),record:crypto.randomUUID(),ids:pages.map(()=>crypto.randomUUID()),uploaded:new Set(),created:false};const state=progress.current;
   if(!state.created){await api('/api/folders',{method:'POST',body:JSON.stringify({name:title.trim()||t('나의 작은 추억책','My little memory book'),category:'개인',groupId:null,source:'organizer',creationId:state.folder})});state.created=true;}
   await api('/api/folders',{method:'PUT',body:JSON.stringify({action:'style',id:state.folder,theme:'diary'})});
   for(let i=0;i<pages.length;i++){setStatus(t(`${i+1}/${pages.length}쪽 보관 중`, `Saving page ${i+1} of ${pages.length}`));const id=state.ids[i];if(state.uploaded.has(id))continue;const body=new FormData();body.set('id',id);body.set('folderId',state.folder);body.set('name',pages[i].file.name);body.set('created',String(Date.now()));body.set('shared','false');body.set('file',pages[i].file);await api('/api/photos',{method:'POST',body});state.uploaded.add(id);}
   const now=new Date(),day=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
   await api('/api/memories',{method:'POST',body:JSON.stringify({id:state.record,folderId:state.folder,title:title.trim()||t('나의 작은 추억책','My little memory book'),body:[companions,story].filter(Boolean).join('\n\n'),day,shared:false,photoIds:state.ids,maker:metadata()})});setSaved(state.folder);
  }catch{measure('album_save_failed',{reason:'other'});setError(t('보관을 마치지 못했어요. 완성본은 다운로드할 수 있고, 다시 누르면 보관을 이어갑니다.','Could not finish saving. You can still download your book or retry to resume saving.'));}finally{working.current=false;setBusy(false);setStatus('');}
 }
 return <main ref={root} className="keepsake-shell" lang={locale}><nav className="keepsake-nav"><Link href={`/make?lang=${locale}`}>memonestia</Link><Link href={`/library?lang=${locale}`}>{t('내 추억책','My books')}</Link></nav>
 <div className="keepsake-work"><header><span className="keepsake-kicker">YOUR PHOTOS. A LITTLE BOOK.</span><h1>{step==='result'?t('당신의 추억, 한 권이 되었어요.','Your memories, made into a little book.'):t('사진과 이야기만 들려주세요.','Your photos. A few words. We’ll do the rest.')}</h1><p>{step==='result'?t('한 장씩 넘겨보세요. 사진과 적어주신 이야기를 그대로 담았어요.','Turn the pages. Your photos and words, kept just as you gave them.'):t('표지부터 마지막 편지까지, 한 권으로 정리해드릴게요.','We’ll arrange a cover, your photo pages and a closing letter.')}</p></header>
 <ol className="keepsake-steps">{[t('사진 고르기','Photos'),t('이야기 쓰기','Your words'),t('펼쳐보기','Your book')].map((label,i)=><li key={label} aria-current={['photos','words','result'][i]===step?'step':undefined}><b>0{i+1}</b>{label}</li>)}</ol>
 <input hidden ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,.heic,.heif" aria-label={t('추억책 사진','Memory book photos')} onChange={e=>{void select(Array.from(e.target.files||[]));e.target.value='';}}/>
 {step==='photos'&&<section className="keepsake-panel"><h2>{t('오래 보고 싶은 사진을 골라주세요.','Choose the photos you want to keep coming back to.')}</h2><p>{t('1~8장만 있으면 충분해요. 고른 순서대로 페이지를 만들어요.','One to eight photos is enough. We’ll use the order you choose.')}</p><div className="keepsake-photo-grid">{shots.map((shot,i)=><div key={shot.id}><img src={shot.url} alt={t(`선택한 사진 ${i+1}`,`Selected photo ${i+1}`)}/><span>{String(i+1).padStart(2,'0')}</span><button type="button" disabled={busy} aria-label={t(`${i+1}번째 사진 삭제`,`Remove photo ${i+1}`)} onClick={()=>{release(shot.url);setShots(shots.filter(s=>s.id!==shot.id));}}>×</button></div>)}</div><button className="keepsake-secondary" disabled={busy||shots.length>=8} onClick={pick}>{busy?t('사진 확인 중…','Reading photos…'):shots.length?t('사진 더 고르기','Add photos'):t('내 사진 고르기','Choose my photos')}</button><button className="keepsake-primary" disabled={busy||!shots.length} onClick={()=>move('words')}>{t('이 사진들로 만들기','Make a book with these photos')} →</button><small>{t('로그인 없이 시작 · 미리보기까지 사진은 기기에만 있어요.','No sign-in needed. Preview photos stay on your device.')}</small></section>}
 {step==='words'&&<form className="keepsake-panel" onSubmit={e=>{e.preventDefault();void create();}}><h2>{t('그날을 떠올리면, 무슨 말이 생각나나요?','What would you like to remember about that day?')}</h2><label>{t('남기고 싶은 한마디','The words you want to keep')}<textarea disabled={busy} required maxLength={600} rows={5} value={story} onChange={e=>setStory(e.target.value)} placeholder={t('길을 잘못 들었는데, 너희랑 같이여서 그것마저 좋았어.','We took the wrong turn, but with you even that felt right.')}/></label><p>{t('문장을 잘 쓸 필요 없어요. 적어주신 말을 그대로 마지막 편지에 담아요.','No need to find perfect words. Your message becomes the closing letter, unchanged.')}</p><details><summary>{t('제목과 함께한 사람도 남기기 · 선택','Add a title and who was there · optional')}</summary><label>{t('표지 제목','Cover title')}<input disabled={busy} maxLength={48} value={title} onChange={e=>setTitle(e.target.value)} placeholder={t('오래 간직하고 싶은 날','A day worth keeping')}/></label><label>{t('함께한 사람 또는 날짜','People or date')}<input disabled={busy} maxLength={60} value={companions} onChange={e=>setCompanions(e.target.value)} placeholder={t('지우, 민우와 보낸 10월','An October afternoon with Jiu and Minu')}/></label></details><button className="keepsake-primary" disabled={busy||!story.trim()}>{busy?t('페이지를 만들고 있어요…','Making your pages…'):t('작은 추억책 완성하기','Make my little memory book')} →</button><button type="button" className="keepsake-text-button" disabled={busy} onClick={()=>move('photos')}>{t('← 사진 다시 고르기','← Back to photos')}</button></form>}
 {step==='result'&&pages.length>0&&<section className="keepsake-result"><div className="keepsake-page"><img src={pages[page].url} alt={t(`완성된 추억책 ${page+1}쪽`,`Memory book page ${page+1}`)}/></div><div className="keepsake-pagination"><button aria-label={t('이전 페이지','Previous page')} disabled={!page} onClick={()=>setPage(page-1)}>←</button><span aria-live="polite">{page+1} / {pages.length}</span><button aria-label={t('다음 페이지','Next page')} disabled={page===pages.length-1} onClick={()=>setPage(page+1)}>→</button></div><div className="keepsake-panel"><h2>{t('이 마음을 오래 간직하세요.','Keep this feeling close.')}</h2><p>{t(`표지와 편지를 포함한 ${pages.length}쪽 · 1080 × 1440 JPG 이미지 묶음(ZIP)`,`${pages.length} pages including the cover and letter · 1080 × 1440 JPG images in a ZIP`)}</p><button className="keepsake-primary" disabled={busy} onClick={()=>void download()}>{busy?(status||t('준비 중…','Preparing…')):t('추억책 다운로드','Download my memory book')} ↓</button>{!locked&&<button className="keepsake-text-button" disabled={busy} onClick={()=>move('words')}>{t('이야기 수정하기','Edit my words')}</button>}
 {saved?<div className="keepsake-saved" role="status"><p>{t('내 추억책에 비공개로 보관했어요.','Saved privately to My books.')}</p><Link href={`/library?group=personal&album=${saved}&lang=${locale}`}>{t('보관한 추억책 열기 →','Open saved book →')}</Link><p>{t('다른 기기에서도 찾으려면 계정을 연결해 주세요.','Connect an account to find it on other devices.')}</p><Link href={`/?lang=${locale}&login=1&returnTo=${encodeURIComponent(`/library?group=personal&album=${saved}&lang=${locale}`)}`}>{t('계정 연결하기','Connect an account')}</Link></div>:<details className="keepsake-store"><summary>{t('내 추억책에 보관하고 싶다면','Want to save it to My books?')}</summary><p>{t('완성된 페이지와 글을 나만 보기로 저장해요. 원본 사진은 전송하지 않아요. 비회원은 브라우저 데이터를 지우면 접근을 잃을 수 있어요.','Save the finished pages and text privately. Original photos are not uploaded. Guests can lose access if browser data is cleared.')}</p><label className="keepsake-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span>{t('이용약관에 동의하고 개인정보 안내를 확인했어요.','I agree to the Terms and have read the Privacy Notice.')} <Link href="/terms" target="_blank">{t('약관','Terms')}</Link> · <Link href="/privacy" target="_blank">{t('개인정보','Privacy')}</Link></span></label><button className="keepsake-secondary" disabled={busy||!consent} onClick={()=>void save()}>{locked?t('이어서 보관하기','Resume saving'):t('나만 보기로 보관하기','Save privately')}</button></details>}
 </div></section>}{error&&<p className="keepsake-error" role="alert">{error}</p>}</div></main>;
}
