'use client';
/* eslint-disable @next/next/no-img-element -- Local object URLs and existing public album photos. */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Camera, Heart, Mail, Plus, X } from 'lucide-react';
import './album-lab.css';

type Memory = { id: string; photo: string; title: string; note: string };
const initial: Memory[] = [
 {id:'day',photo:'/explore/album-samples/cafe-friends.jpg',title:'별일 없어서 좋았던 날',note:'대단한 계획은 없었는데, 웃다 보니 하루가 다 갔네. 다음에도 이렇게 만나자.'},
 {id:'birthday',photo:'/explore/album-samples/family-birthday.jpg',title:'태어나줘서 고마워',note:'케이크 앞에서 빌었던 소원, 천천히 다 이뤄졌으면 좋겠어. 올해도 같이 축하해서 좋았다.'},
 {id:'travel',photo:'/explore/album-samples/jeju-couple.jpg',title:'우리의 작은 여행',note:'어디를 갔는지보다 누구랑 걸었는지가 더 오래 남는 것 같아. 이 풍경을 보면 그날이 생각날 거야.'},
 {id:'spring',photo:'/explore/album-samples/spring-picnic.jpg',title:'다음 봄에도 같이',note:'사진에는 바람도, 우리가 하던 얘기도 안 담겼지만 나는 아직 기억해. 우리 다음 봄에도 여기 오자.'},
];

export default function AlbumLab(){
 const [mode,setMode]=useState<'letters'|'camera'>('letters');
 const [memories,setMemories]=useState(initial);
 const [opened,setOpened]=useState<string|null>(null),[read,setRead]=useState<string[]>([]);
 const [writing,setWriting]=useState(false),[title,setTitle]=useState(''),[note,setNote]=useState(''),[photo,setPhoto]=useState(''),[error,setError]=useState('');
 const [phase,setPhase]=useState<'sealed'|'developing'|'ready'>('sealed'),[frame,setFrame]=useState(0);
 const [date,setDate]=useState(''),[busy,setBusy]=useState(false);
 const urls=useRef<string[]>([]),timer=useRef<ReturnType<typeof setTimeout>|null>(null),opener=useRef<HTMLElement|null>(null),closeButton=useRef<HTMLButtonElement|null>(null),dialog=useRef<HTMLDivElement|null>(null);
 useEffect(()=>()=>{urls.current.forEach(URL.revokeObjectURL);if(timer.current)clearTimeout(timer.current);},[]);
 const modal=writing||!!opened;
 useEffect(()=>{if(modal){opener.current=document.activeElement as HTMLElement;closeButton.current?.focus();return()=>opener.current?.focus();}},[modal]);
 const active=memories.find(item=>item.id===opened);
 function close(){setOpened(null);setWriting(false);setError('');}
 function openLetter(id:string){setOpened(id);setRead(old=>old.includes(id)?old:[...old,id]);}
 async function pick(files:FileList|null,forLetter:boolean){
  if(!files?.length)return;setError('');setBusy(true);
  try{const next:Memory[]=[];for(const file of Array.from(files).slice(0,forLetter?1:12-memories.length)){
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024){setError('20MB 이하의 JPG·PNG·WebP 사진을 골라주세요.');continue;}
   const url=URL.createObjectURL(file);urls.current.push(url);
   if(forLetter)setPhoto(url);else next.push({id:crypto.randomUUID(),photo:url,title:'우리가 남긴 한 장',note:''});
  }if(next.length)setMemories(old=>[...old,...next].slice(0,12));}finally{setBusy(false);}
 }
 function develop(){if(phase!=='sealed')return;setPhase('developing');timer.current=setTimeout(()=>{setPhase('ready');setFrame(0);},1800);}
 return <main className={`album-lab lab-${mode}`}>
  <div className="lab-review"><span>LOCAL PREVIEW</span><p>사진과 글은 이 화면에서만 유지됩니다. 새로고침하면 초기화돼요.</p></div>
  <header className="lab-header"><Link href="/entry-preview"><ArrowLeft size={16}/> 앨범 고르기</Link><span>memonestia.</span><small>작은 순간을 오래.</small></header>
  <nav className="lab-tabs" aria-label="새 앨범 체험"><button aria-pressed={mode==='letters'} onClick={()=>setMode('letters')}><Mail size={17}/> 편지함</button><button aria-pressed={mode==='camera'} onClick={()=>setMode('camera')}><Camera size={17}/> 일회용 카메라</button></nav>
  {mode==='letters'?<section className="letter-room">
   <div className="lab-intro"><span>LETTERS WE KEEP</span><h1>사진 뒤에,<br/>못다 한 마음 한 장.</h1><p>봉투를 열어보세요.<br/>그날의 사진과 한마디가 함께 기다리고 있어요.</p></div>
   <div className="letter-toolbar"><span>{memories.length}통의 편지 · {read.length}통 읽음</span><button onClick={()=>{setTitle('');setNote('');setPhoto('');setWriting(true);}} disabled={memories.length>=12}><Plus size={16}/> 편지 남기기</button></div>
   <div className="envelope-grid">{memories.map((item,index)=><button key={item.id} className={`envelope envelope-${index%4} ${read.includes(item.id)?'is-read':''}`} onClick={()=>openLetter(item.id)} aria-label={`${item.title} 편지 열기`}>
    <div className="envelope-peek"><img src={item.photo} alt=""/></div><div className="envelope-paper"><span className="envelope-stamp">WITH<br/>LOVE ♡</span><small>LETTER {String(index+1).padStart(2,'0')}</small><strong>{item.title}</strong><span className="envelope-status">{read.includes(item.id)?'다시 펼쳐보기':'아직 열지 않은 마음'} ↗</span></div><span className="envelope-seal"><Heart size={18}/></span>
   </button>)}</div>
   <p className="letter-bottom">보관하고 싶은 건 사진만이 아니니까.</p>
  </section>:<section className="lab-camera-room">
   <div className="lab-intro"><span>SEE YOU AFTER THE TRIP</span><h1>찍을 땐 몰랐던,<br/>우리의 좋은 장면.</h1><p>각자의 사진을 한 롤에 담고,<br/>약속한 날 함께 꺼내보는 앨범.</p></div>
   <div className="camera-workbench">
    <div className={`disposable-camera ${phase==='developing'?'is-developing':''}`} aria-label={`필름 ${memories.length}장`}><div className="camera-top"><span>MEMO 400</span><i/><span className="camera-counter">{String(memories.length).padStart(2,'0')} / 12</span></div><div className="camera-middle"><span>ONE LITTLE<br/><b>TRIP.</b></span><div className="camera-lens"><i/></div><span className="camera-flash"/></div><div className="camera-bottom"><span>KEEP THE MOMENT. WAIT FOR THE MAGIC.</span><span>ISO 400</span></div></div>
    {phase!=='ready'?<div className="film-waiting"><div className="film-negatives" aria-hidden="true">{memories.map(item=><i key={item.id}/>)}</div>
     <h2>{phase==='developing'?'우리의 순간을 현상하고 있어요':'아직 펼치지 않은 추억 '+memories.length+'장'}</h2>
     <p>{date?`${new Date(date).toLocaleString('ko-KR')}에 함께 열어볼 앨범`:'사진을 모으고, 함께 열어볼 날을 정해보세요.'}</p>
     <label className="lab-date">함께 열어볼 날<input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} disabled={phase==='developing'}/></label>
     <div className="lab-camera-actions"><label className="lab-file-button"><Plus size={16}/> 내 사진 더 담기<input aria-label="카메라에 사진 추가" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy||phase==='developing'||memories.length>=12} onChange={e=>{void pick(e.target.files,false);e.target.value='';}}/></label><button className="lab-primary" disabled={phase==='developing'} onClick={develop}>{phase==='developing'?'현상 중…':'공개 시점 체험하기'}<ArrowRight size={16}/></button></div>
     <small>로컬 시안에서는 기다리지 않고 현상 과정을 체험할 수 있어요.</small><p role="status" className="lab-status">{phase==='developing'?'필름을 현상하고 있어요. 잠시 뒤 사진이 나타납니다.':error}</p>
    </div>:<div className="developed-room"><span className="developed-label">DEVELOPED WITH LOVE · {memories.length} FRAMES</span><figure className="developed-print" key={memories[frame].id}><img src={memories[frame].photo} alt={memories[frame].title}/><figcaption><span>{String(frame+1).padStart(2,'0')}</span><strong>{memories[frame].title}</strong><Heart size={18}/></figcaption></figure><div className="film-navigation"><button disabled={frame===0} aria-label="이전 사진" onClick={()=>setFrame(n=>n-1)}><ArrowLeft/></button><span>{frame+1} / {memories.length}</span><button disabled={frame===memories.length-1} aria-label="다음 사진" onClick={()=>setFrame(n=>n+1)}><ArrowRight/></button></div><button className="camera-reset" onClick={()=>setPhase('sealed')}>필름에 다시 넣어두기</button><p role="status">현상 완료. 한 장씩 넘겨보세요.</p></div>}
   </div>
  </section>}
  {modal&&<div className="letter-overlay" onClick={e=>{if(e.target===e.currentTarget)close();}}><div className="letter-dialog" role="dialog" aria-modal="true" aria-labelledby="letter-dialog-title" ref={dialog} onKeyDown={e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const nodes=[...dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea')];const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}>
   <button className="letter-close" aria-label="편지 닫기" ref={closeButton} onClick={close}><X size={22}/></button>
   {writing?<form onSubmit={e=>{e.preventDefault();if(!photo||!title.trim()||!note.trim())return;setMemories(old=>[...old,{id:crypto.randomUUID(),photo,title:title.trim(),note:note.trim()}]);close();}}><span className="letter-kicker">A LITTLE NOTE FOR YOU</span><h2 id="letter-dialog-title">사진 뒤에 마음을 적어요.</h2><label className="letter-photo-pick">{photo?<img src={photo} alt="선택한 사진"/>:<><Plus/>사진 한 장 고르기</>}<input aria-label="편지 사진 선택" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{void pick(e.target.files,true);e.target.value='';}}/></label><label>봉투에 적을 말<input required maxLength={40} value={title} onChange={e=>setTitle(e.target.value)} placeholder="같이 웃던 그날을 기억해"/></label><label>사진 뒤에 남길 편지<textarea required maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="사진만으로는 다 담지 못했던 말…" rows={5}/></label>{error&&<p role="alert">{error}</p>}<button className="lab-primary" disabled={busy||!photo||!title.trim()||!note.trim()}>봉투에 담기 <Mail size={17}/></button></form>:active&&<article><span className="letter-kicker">SOME WORDS STAY WITH US.</span><div className="letter-open-photo"><img src={active.photo} alt={active.title}/></div><h2 id="letter-dialog-title">{active.title}</h2><p className="letter-handwriting">{active.note||'이 사진 뒤에 남길 이야기는 아직 비어 있어요.'}</p><div className="letter-signoff">오래도록, 우리의 한 장. <Heart size={18}/></div></article>}
  </div></div>}
 </main>;
}
