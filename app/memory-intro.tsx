'use client';
/* eslint-disable @next/next/no-img-element -- Bundled editorial preview photos. */
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import type {Locale} from './i18n';
import AnimalMascot from './animal-mascot';
import {MemoryPhotoPlay,MemoryNotePlay} from './memory-intro-play';
import {trackClient} from '@/lib/growth-client';
import './memory-intro.css';
import {keepIntroPhoto} from '@/lib/intro-photo';
import type {ClientGrowthEvent} from '@/lib/growth-events';

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
 const root=useRef<HTMLElement>(null),attempt=useRef(''),sent=useRef(new Set<string>());
 const picker=useRef<HTMLInputElement>(null),[photo,setPhoto]=useState<{file:File;url:string}|null>(null),[photoError,setPhotoError]=useState('');
 useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo.url);},[photo]);
 function measure(event:ClientGrowthEvent){
  if(sent.current.has(event))return;sent.current.add(event);attempt.current ||= crypto.randomUUID();
  void trackClient(event,{attempt_id:attempt.current,locale,template_id:'album-intro'});
 }
 useEffect(()=>{const emit=(event:'memory_intro_viewed'|'memory_intro_engaged')=>{if(sent.current.has(event))return;sent.current.add(event);attempt.current ||= crypto.randomUUID();void trackClient(event,{attempt_id:attempt.current,locale,template_id:'album-intro'});};emit('memory_intro_viewed');let elapsed=0;const timer=setInterval(()=>{if(document.visibilityState==='visible')elapsed++;if(elapsed>=10){emit('memory_intro_engaged');clearInterval(timer);}},1000);return()=>clearInterval(timer);},[locale]);
 const next=new URLSearchParams(params.toString());next.set('stage','create');next.set('lang',locale);if(!next.has('occasion')&&!next.has('template'))next.set('occasion','travel');
 function openPhoto(){measure('album_maker_viewed');measure('album_picker_opened');picker.current?.click();}
 function choosePhoto(file?:File){
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>20*1024**2){setPhotoError(ko?'20MB 이하의 JPG·PNG·WebP 사진을 골라주세요.':'Choose a JPG, PNG or WebP photo up to 20 MB.');return;}
  setPhotoError('');setPhoto({file,url:URL.createObjectURL(file)});measure('album_photos_selected');
 }
 function begin(){if(photo)keepIntroPhoto(photo.file);measure('memory_intro_started');onStart?.();}
 const continueAction=onStart?<button type="button" onClick={begin}>{ko?'이 사진에 내 기억 남기기':'Add my memory to this photo'} ↗</button>:<Link href={`/make?${next}`} onClick={begin}>{ko?'이 사진에 내 기억 남기기':'Add my memory to this photo'} ↗</Link>;
 const startAction=photo?continueAction:<button type="button" onClick={openPhoto}>{ko?'내 사진 한 장으로 바꿔보기':'Try it with my photo'} <span aria-hidden="true">↗</span></button>;

 useEffect(()=>{
  const el=root.current;if(!el)return;const motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
  const update=()=>{frame=0;el.style.setProperty('--intro-progress',String(el.scrollTop/Math.max(1,el.scrollHeight-el.clientHeight)));el.style.setProperty('--intro-drift',motion.matches?'0px':Math.min(180,el.scrollTop*.22)+'px');};
  const scroll=()=>{if(!frame)frame=requestAnimationFrame(update);};el.addEventListener('scroll',scroll,{passive:true});update();
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-in-view');observer.unobserve(entry.target);}});},{root:el,threshold:.08});
  if(!motion.matches){el.dataset.motion='on';el.querySelectorAll('.memory-intro-chapter').forEach(item=>observer.observe(item));}
  return()=>{el.removeEventListener('scroll',scroll);cancelAnimationFrame(frame);observer.disconnect();delete el.dataset.motion;};
 },[]);
 return <section ref={root} className="memory-intro" lang={locale}>
  <input ref={picker} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label={ko?'카드에 넣을 내 사진':'Your photo for the card'} onChange={e=>{choosePhoto(e.target.files?.[0]);e.target.value='';}}/>
  <div className="memory-intro-progress" aria-hidden="true"/>
  <header className="memory-intro-nav"><span>memonestia</span><Link href={`/?lang=${locale}&login=1`}>{ko?'로그인':'Sign in'}</Link></header>
  <div className="memory-intro-grid"><div className="memory-intro-copy"><span className="memory-intro-eyebrow">A LITTLE PHOTO. A LONG STORY.</span><h1>{copy[0]}<br/><em>{copy[1]}</em></h1><p>{ko?'사진 한 장 뒤에, 서로가 기억하는 그날을 남겨요.':'A photo on the front. The day as each of you remembers it on the back.'}</p><p className="memory-intro-instruction">{ko?'옆의 카드를 눌러 친구의 기억을 읽어보세요.':'Tap the card to read the memories behind it.'}</p>
   <div className="memory-intro-cta">{startAction}<small>{ko?'로그인 없이 시작 · 저장 전에는 사진이 전송되지 않아요':'Start without signing in · Photos stay on your device until you save'}</small></div>
  </div><div className="memory-intro-demo"><MemoryPhotoPlay key={photo?.url||occasion} personalPhoto={photo?.url} onPhotoError={()=>{setPhoto(null);setPhotoError(ko?'사진을 읽지 못했어요. 다른 사진을 골라주세요.':'Could not read this photo. Please choose another.');}} onPhotoReady={()=>measure('album_preview_ready')} ko={ko} photo={example.photo} words={[copy[2],copy[3]]} onFlip={()=>measure('memory_intro_flipped')}/><div className="memory-intro-remix">{photo?<><p role="status">{ko?'내 사진으로 바뀌었어요. 이제 그날의 한마디를 남겨볼까요?':'Your photo is in. What do you remember about that day?'}</p><button type="button" onClick={openPhoto}>{ko?'다른 사진 고르기':'Choose another photo'}</button></>:<p>{ko?'휴대폰에 있는 그날 사진, 딱 한 장만 골라보세요.':'Pick just one photo of a day you want to keep.'}</p>}<div className="memory-intro-cta">{startAction}<small>{ko?'로그인 없이 미리보기 · 저장 전에는 사진이 전송되지 않아요':'Preview without signing in · Nothing is uploaded until you save'}</small></div>{photoError&&<p role="alert">{photoError}</p>}</div></div></div>
  <a className="memory-intro-scroll" href="#memories-together">{ko?'사진 뒤에는 어떤 이야기가 남을까요?':'What lives on the other side of a photo?'}<span aria-hidden="true">↓</span></a>
  <section className="memory-intro-chapter memory-intro-perspectives" id="memories-together" aria-labelledby="intro-perspectives-title">
   <div className="memory-intro-section-heading"><span className="memory-intro-eyebrow">01 / SAME DAY, YOUR WORDS</span><h2 id="intro-perspectives-title">{ko?'같은 날을 보내고,':'We shared the day.'}<br/>{ko?'다른 장면을 간직했어요.':'We kept different moments.'}</h2><p>{ko?'내가 기억하는 웃긴 순간, 친구가 고마웠던 작은 일. 사진 한 장에 서로의 이야기가 더해져요.':'The moment that made you laugh. The little thing your friend was grateful for. One photo, with room for both stories.'}</p></div>
   <div className="memory-intro-storyboard"><figure><img src={`/explore/album-samples/${example.photo}.jpg`} loading="lazy" alt={ko?'서로 다른 기억이 담긴 하루의 예시':'An example day remembered in two ways'}/><figcaption>{ko?'우리가 함께 보낸 그날':'The day we spent together'} <span>♡</span></figcaption></figure><div className="memory-intro-letters">{[copy[2],copy[3]].map((words,i)=><blockquote key={i}><p>“{words}”</p><footer><span className="memory-intro-animal"><AnimalMascot animal={i?'otter':'cat'}/></span><span>{ko?(i?'민우가 기억하는 그날':'지우가 기억하는 그날'):(i?'The day, as Minu remembers it':'The day, as Jiu remembers it')}</span></footer></blockquote>)}</div></div>
   <small className="memory-intro-example">{ko?'사진과 글은 사용 방법을 보여주는 예시입니다.':'Photos and words are illustrative examples.'}</small>
  </section>
  <section className="memory-intro-chapter memory-intro-meaning" aria-labelledby="intro-meaning-title"><span className="memory-intro-eyebrow">02 / MORE THAN A PHOTO</span><h2 id="intro-meaning-title">{ko?'사진은 그날의 모습을,':'Photos keep what we saw.'}<br/>{ko?'한마디는 그날의 마음을.':'Words keep how it felt.'}</h2><p>{ko?'단톡방에서 흘러간 “그때 진짜 좋았는데”. 이제 그 사진 옆에 남겨두세요. 각자의 캐릭터와 한마디가 모이면, 다시 펼쳐보고 싶은 우리의 이야기가 됩니다.':'“That was such a good day.” Keep those words beside the photo instead of letting them disappear up the group chat. A little character and a few words make each memory feel like its person.'}</p><MemoryNotePlay ko={ko}/></section>
  <section className="memory-intro-chapter" aria-labelledby="intro-how-title"><div className="memory-intro-section-heading"><span className="memory-intro-eyebrow">03 / A LITTLE FROM EACH OF US</span><h2 id="intro-how-title">{ko?'나는 한 장, 친구도 한 장.':'One from me. One from you.'}</h2><p>{ko?'완벽하게 정리하지 않아도 괜찮아요. 먼저 떠오르는 장면부터 시작해요.':'No need to organize everything. Start with the moment that comes to mind.'}</p></div><ol className="memory-intro-how">{(ko?[['01','내 사진과 한마디','함께 찍은 사진을 고르고, 내가 기억하는 이야기를 남겨요.'],['02','친구에게 링크 보내기','단톡방이나 메시지로 링크를 보내고, 친구의 기억도 물어봐요.'],['03','우리의 기억으로 완성','친구가 사진과 이야기를 보태면, 각자의 시선이 한 편에 모여요.']]:[['01','Your photo, your words','Pick a photo together and add what you remember.'],['02','Send a link to a friend','Share the link in your chat and ask for their side of the story.'],['03','A story made together','As friends add their photos and words, the story becomes yours together.']]).map(([number,title,body])=><li key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></li>)}</ol><p className="memory-intro-participation">{ko?'여행편에 초대받은 친구도 앱 설치·회원가입 없이 기억을 보탤 수 있어요.':'Friends invited to a trip story can contribute without installing an app or signing up.'}</p></section>
  <section className="memory-intro-chapter" aria-labelledby="intro-occasions-title"><div className="memory-intro-section-heading"><span className="memory-intro-eyebrow">04 / FOR YOUR KIND OF DAY</span><h2 id="intro-occasions-title">{ko?'어떤 날을 다시 펼쳐볼까요?':'Which day would you revisit?'}</h2></div><div className="memory-intro-occasions">{(['travel','couple','family'] as const).map((kind,i)=>{const item=examples[kind],q=new URLSearchParams(params.toString());q.delete('template');q.delete('stage');q.delete('mode');q.delete('themes');q.set('occasion',kind);q.set('lang',locale);return <Link key={kind} href={`/make?${q}`}><img src={`/explore/album-samples/${kind==='travel'?'hiking-friends':item.photo}.jpg`} loading="lazy" alt={ko?['함께 떠난 여행 예시','둘이 보낸 하루 예시','가족과의 일상 예시'][i]:['A trip together','A day for two','An everyday family moment'][i]}/><div><span>{ko?['함께 떠난 여행','둘이 보낸 하루','가족의 보통날'][i]:['A trip together','A day for two','Ordinary family days'][i]}</span><p>{(ko?item.ko:item.en)[0]} {(ko?item.ko:item.en)[1]}</p><small>{ko?'예시 펼쳐보기 ↗':'Explore this example ↗'}</small></div></Link>;})}</div></section>
  <section className="memory-intro-closing" aria-labelledby="intro-start-title"><span className="memory-intro-eyebrow">START WITH ONE MOMENT</span><h2 id="intro-start-title">{ko?'그날 사진, 아직 휴대폰에 있죠?':'Still have that photo on your phone?'}</h2><p>{ko?'사진 한 장이면 시작할 수 있어요. 나머지 이야기는 함께 채워요.':'One photo is enough to begin. Fill in the rest together.'}</p><div className="memory-intro-cta">{startAction}<small>{ko?'로그인 없이 시작 · 저장 전에는 사진이 전송되지 않아요':'Start without signing in · Photos stay on your device until you save'}</small></div></section>
  <footer className="memory-intro-footer"><span>memonestia · {ko?'우리의 순간을, 함께.':'Your moments. Together.'}</span><Link href={`/?lang=${locale}&home=1`}>{ko?'먼저 둘러볼게요 →':'Explore first →'}</Link></footer>
 </section>;
}
