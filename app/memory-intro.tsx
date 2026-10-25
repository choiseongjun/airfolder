'use client';
/* eslint-disable @next/next/no-img-element -- Bundled editorial preview photos. */
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import type {Locale} from './i18n';
import AnimalMascot from './animal-mascot';
import {trackClient} from '@/lib/growth-client';
import './memory-intro.css';

const examples={
 travel:{photo:'jeju-couple',ko:['같이 다녀왔지만,','기억은 다 다르니까.','바다보다 네 웃음이 먼저 생각나. 길을 잘못 든 덕분에 만난 그 바다도.','다음엔 내가 길 찾을게. 아니, 또 길을 잃어도 좋겠다.'],en:['Same trip.','Different memories.','I remember your laugh before the sea. And the beach we only found because we got lost.','Next time I’ll navigate. Or maybe getting lost together is the best part.']},
 couple:{photo:'jeju-couple',ko:['사진에는 우리 둘,','뒷면에는 서로의 마음.','네가 찍어준 사진은 늘 조금 흔들려. 내가 자꾸 웃어서 그런가 봐.','그날 네가 좋아한 바다 색을 아직 기억해.'],en:['Us in the photo.','Our feelings on the back.','Your photos of me are always a little blurry. Maybe because you keep making me laugh.','I still remember the color of the sea you loved that day.']},
 family:{photo:'autumn-family',ko:['평범했던 하루가,','가장 소중한 장면으로.','사진 찍기 싫다던 아빠가 제일 크게 웃었던 날.','돌아오는 길에 먹었던 붕어빵까지 기억하고 싶어.'],en:['An ordinary day.','An extraordinary memory.','Dad said he didn’t want a photo. Then gave us the biggest smile.','I want to remember even the warm pastries on the way home.']},
 friends:{photo:'cafe-friends',ko:['단톡방에 묻히기엔,','너무 우리다운 순간들.','별 얘기도 안 했는데 집에 오는 길까지 웃음이 났어.','다음에도 그 자리. 늦는 사람이 커피 사기.'],en:['Too good to lose','in the group chat.','We talked about nothing. I was still smiling all the way home.','Same place next time. Whoever’s late buys the coffee.']},
 daily:{photo:'spring-picnic',ko:['아무 일 없던 날도,','다시 펼쳐보고 싶도록.','할 일 없이 앉아 있던 오후. 이런 날이 오래 기억나더라.','좋아하는 사람들과 좋아하는 계절을 보내는 일.'],en:['Even quiet days','deserve a second look.','An afternoon with nothing to do. Somehow those days stay with me.','My favorite season, spent with my favorite people.']},
} as const;
export default function MemoryIntro({locale,onStart}:{locale:Locale;onStart?:()=>void}){
 const params=useSearchParams(),ko=locale==='ko';
 const occasion=params.get('occasion')||({ 'album-polaroid':'couple','album-diary':'family','album-birthday':'friends','album-film':'daily'}[params.get('template')||'']??'travel');
 const example=examples[occasion as keyof typeof examples]||examples.travel,copy=ko?example.ko:example.en;
 const [back,setBack]=useState(false),attempt=useRef(''),sent=useRef(new Set<string>());
 function measure(event:'memory_intro_viewed'|'memory_intro_flipped'|'memory_intro_started'|'memory_intro_engaged'){
  if(sent.current.has(event))return;sent.current.add(event);attempt.current ||= crypto.randomUUID();
  void trackClient(event,{attempt_id:attempt.current,locale});
 }
 useEffect(()=>{const emit=(event:'memory_intro_viewed'|'memory_intro_engaged')=>{if(sent.current.has(event))return;sent.current.add(event);attempt.current ||= crypto.randomUUID();void trackClient(event,{attempt_id:attempt.current,locale});};emit('memory_intro_viewed');let elapsed=0;const timer=setInterval(()=>{if(document.visibilityState==='visible')elapsed++;if(elapsed>=10){emit('memory_intro_engaged');clearInterval(timer);}},1000);return()=>clearInterval(timer);},[locale]);
 const next=new URLSearchParams(params.toString());next.set('stage','create');next.set('lang',locale);if(!next.has('occasion')&&!next.has('template'))next.set('occasion','travel');
 return <section className="memory-intro" lang={locale}>
  <header className="memory-intro-nav"><span>memonestia</span><Link href={`/?lang=${locale}&login=1`}>{ko?'로그인':'Sign in'}</Link></header>
  <div className="memory-intro-grid"><div className="memory-intro-copy"><span className="memory-intro-eyebrow">A LITTLE PHOTO. A LONG STORY.</span><h1>{copy[0]}<br/><em>{copy[1]}</em></h1><p>{ko?'사진 한 장 뒤에, 서로가 기억하는 그날을 남겨요.':'A photo on the front. The day as each of you remembers it on the back.'}</p><p className="memory-intro-instruction">{ko?'옆의 카드를 눌러 친구의 기억을 읽어보세요.':'Tap the card to read the memories behind it.'}</p>
   <div className="memory-intro-cta">{onStart?<button type="button" onClick={()=>{measure('memory_intro_started');onStart();}}>{ko?'내 사진으로 만들어보기':'Make it with my photos'} <span aria-hidden="true">↗</span></button>:<Link href={`/make?${next}`} onClick={()=>measure('memory_intro_started')}>{ko?'내 사진으로 만들어보기':'Make it with my photos'} ↗</Link>}<small>{ko?'로그인 없이 시작 · 저장 전에는 사진이 전송되지 않아요':'Start without signing in · Photos stay on your device until you save'}</small></div>
  </div><div className="memory-intro-demo"><button type="button" className={`memory-intro-card${back?' is-back':''}`} aria-pressed={back} aria-label={ko?(back?'예시 사진 앞면 보기':'예시 사진 뒷면의 기억 읽기'):(back?'View example photo':'Read the memories on the back')} onClick={()=>{setBack(!back);if(!back)measure('memory_intro_flipped');}}>
   {back?<div className="memory-intro-notes"><span className="memory-intro-stamp">WITH YOU, ALWAYS.</span><h2>{ko?'너는 이렇게 기억했구나.':'So that’s how you remember it.'}</h2><blockquote>{copy[2]}<footer><span className="memory-intro-animal"><AnimalMascot animal="cat"/></span>{ko?'지우의 기억':'Jiu’s memory'}</footer></blockquote><blockquote>{copy[3]}<footer><span className="memory-intro-animal"><AnimalMascot animal="otter"/></span>{ko?'민우의 기억':'Minu’s memory'}</footer></blockquote></div>:<><img src={`/explore/album-samples/${example.photo}.jpg`} alt={ko?'함께 보낸 하루의 예시 사진':'An example of a day spent together'} fetchPriority="high"/><div className="memory-intro-caption"><span>{ko?'우리가 함께한 어느 날':'One of our days together'}</span><span aria-hidden="true">♡</span></div></>}
   <span className="memory-intro-flip">{ko?(back?'↻ 사진으로 돌아가기':'↻ 사진 뒤에 남긴 두 사람의 기억'):(back?'↻ Back to the photo':'↻ Two memories behind this photo')}</span>
  </button><small className="memory-intro-example">{ko?'이해를 돕기 위한 예시 카드':'An example card to explore'}</small></div></div>
  <footer className="memory-intro-footer">{ko?'한 장을 고르고 → 내 기억을 남기고 → 친구의 기억까지 모아요.':'Choose a photo → Add your memory → Invite theirs.'}<Link href={`/?lang=${locale}&home=1`}>{ko?'먼저 둘러볼게요 →':'Explore first →'}</Link></footer>
 </section>;
}
