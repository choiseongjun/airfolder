'use client';
/* eslint-disable @next/next/no-img-element -- Bundled public preview photos. */
import {useRef,useState,type CSSProperties} from 'react';
import AnimalMascot from './animal-mascot';
import type {CharacterAnimal} from '@/lib/character-style';
import './memory-intro-play.css';

export function MemoryPhotoPlay({ko,photo,words,onFlip,personalPhoto,onPhotoReady,onPhotoError}:{onPhotoError?:()=>void;personalPhoto?:string;onPhotoReady?:()=>void;ko:boolean;photo:string;words:readonly string[];onFlip:()=>void}){
 const photos=[photo,'hiking-friends','cafe-friends'].filter((value,index,all)=>all.indexOf(value)===index);
 const [index,setIndex]=useState(0),[back,setBack]=useState(false),start=useRef<{x:number;y:number}|null>(null),swiped=useRef(false);
 const choose=(next:number)=>{setIndex((next+photos.length)%photos.length);setBack(false);};
 return <div className="memory-play" aria-label={ko?'사진 카드 체험':'Try the photo cards'}>
  <div className="memory-play-stage">
   <button className="memory-play-wing memory-play-wing-left" aria-label={ko?'이전 예시 사진':'Previous example photo'} onClick={()=>choose(index-1)}><img src={`/explore/album-samples/${photos[(index+photos.length-1)%photos.length]}.jpg`} alt=""/><span>little moments</span></button>
   <button className="memory-play-wing memory-play-wing-right" aria-label={ko?'다음 예시 사진':'Next example photo'} onClick={()=>choose(index+1)}><img src={`/explore/album-samples/${photos[(index+1)%photos.length]}.jpg`} alt=""/><span>with my people</span></button>
   <button type="button" className={`memory-play-main${back?' is-flipped':''}`} aria-pressed={back} aria-label={ko?(back?'사진 앞면 보기':'카드 뒤집어 기억 읽기'):(back?'See the photo':'Flip the card to read memories')}
    onPointerDown={e=>{start.current={x:e.clientX,y:e.clientY};swiped.current=false;}}
    onPointerUp={e=>{const s=start.current;start.current=null;if(s&&Math.abs(e.clientX-s.x)>55&&Math.abs(e.clientY-s.y)<45){swiped.current=true;choose(index+(e.clientX<s.x?1:-1));}}}
    onPointerCancel={()=>{start.current=null;}}
    onClick={e=>{if(swiped.current&&e.detail!==0){swiped.current=false;return;}swiped.current=false;setBack(!back);if(!back)onFlip();}}>
    <span className="memory-play-turner"><span className="memory-play-face memory-play-front" aria-hidden={back}><img src={personalPhoto||`/explore/album-samples/${photos[index]}.jpg`} onLoad={()=>{if(personalPhoto)onPhotoReady?.();}} onError={()=>{if(personalPhoto)onPhotoError?.();}} alt={ko?'함께한 순간의 예시 사진':'An example of a moment together'} fetchPriority="high"/><span className="memory-play-photo-title">{ko?'우리의 어느 날':'One of our days'}<span>♡</span></span><span className="memory-play-photo-hint">{ko?'눌러서 뒷면의 기억 보기 ↻':'Tap to read the other side ↻'}</span></span>
    <span className="memory-play-face memory-play-back" aria-hidden={!back}><span className="memory-play-back-label">SAME MOMENT, TWO MEMORIES</span><strong>{ko?'너는 이렇게 기억했구나.':'So that’s how you remember it.'}</strong>{(personalPhoto?[ko?'이 사진을 보면 가장 먼저 떠오르는 순간은?':'What comes to mind when you see this photo?',ko?'다음 화면에서 내 한마디를 적어보세요.':'Add your own words on the next screen.']:index===0?words:[ko?'사진 찍고 나서도 한참을 웃었지.':'We kept laughing long after the photo.',ko?'특별한 계획은 없었는데, 오래 기억에 남아.':'No special plans. A day I’ll always remember.']).map((word,i)=><span className="memory-play-word" key={i}>{word}<span><span className="memory-play-avatar"><AnimalMascot animal={i?'otter':'cat'}/></span>{personalPhoto?(ko?'내 기억을 기다리는 중':'Waiting for your memory'):ko?(i?'민우의 기억':'지우의 기억'):(i?'Minu’s memory':'Jiu’s memory')}</span></span>)}<span className="memory-play-photo-hint">{ko?'다시 누르면 사진으로 ↻':'Tap again for the photo ↻'}</span></span></span>
   </button>
   <span className="memory-play-doodle" aria-hidden="true">✳</span><span className="memory-play-tag" aria-hidden="true">{ko?'사진 너머의 우리':'more than a photo'}</span>
  </div>
  <div className="memory-play-controls" hidden={!!personalPhoto}><button aria-label={ko?'이전 사진':'Previous photo'} onClick={()=>choose(index-1)}>←</button><div role="group" aria-label={ko?'예시 사진 선택':'Choose an example photo'}>{photos.map((_,i)=><button key={i} aria-label={ko?`${i+1}번째 사진`:`Photo ${i+1}`} aria-pressed={index===i} onClick={()=>choose(i)}><span/></button>)}</div><button aria-label={ko?'다음 사진':'Next photo'} onClick={()=>choose(index+1)}>→</button></div>
  <p className="memory-play-caption">{personalPhoto?(ko?'내 사진 미리보기 · 눌러서 뒤집어보세요':'Your photo preview · Tap to flip'):(ko?'옆으로 넘기고, 눌러서 뒤집어보세요. · 예시 카드':'Swipe to browse. Tap to turn it over. · Example cards')}</p>
 </div>;
}

export function MemoryNotePlay({ko}:{ko:boolean}){
 const [animal,setAnimal]=useState<CharacterAnimal>('otter'),[note,setNote]=useState(''),[choice,setChoice]=useState(0);
 const lines=ko?['너희 덕분에 많이 웃었어.','우리, 다음에도 같이 가자.','사진엔 없지만 정말 고마웠어.']:['You made me laugh so much.','Let’s do this together again.','The photo doesn’t show it, but thank you.'];
 const friends:[CharacterAnimal,string,string][]=[['otter','수달','Otter'],['cat','고양이','Cat'],['rabbit','토끼','Bunny'],['duck','오리','Duck']];
 return <div className="memory-note-play"><div className="memory-note-tools"><span className="memory-play-back-label">TRY A LITTLE MEMORY</span><h3>{ko?'한마디에 나를 담아보세요.':'Make a little memory yours.'}</h3><div className="memory-note-friends" role="group" aria-label={ko?'내 캐릭터 선택':'Choose your character'}>{friends.map(([id,k,e])=><button key={id} aria-pressed={animal===id} onClick={()=>setAnimal(id)}><span><AnimalMascot animal={id}/></span>{ko?k:e}</button>)}</div><div className="memory-note-prompts" role="group" aria-label={ko?'한마디 골라보기':'Try a message'}>{lines.map((line,i)=><button key={line} aria-pressed={choice===i&&!note} onClick={()=>{setChoice(i);setNote('');}}>{line}</button>)}</div><label className="memory-note-input">{ko?'직접 써볼까요?':'Or write your own'}<input value={note} maxLength={100} onChange={e=>setNote(e.target.value)} placeholder={ko?'그날 네가 해준 말이 아직 기억나…':'I still remember what you said that day…'}/></label><small>{ko?'체험용 미리보기예요. 입력한 글은 저장·전송되지 않아요.':'Just a preview. Your words are not saved or sent.'}</small></div><div className="memory-note-preview" style={{'--note-tone':animal==='cat'?'#f4e0c5':animal==='rabbit'?'#f0dfe3':animal==='duck'?'#f5e9bd':'#dde5d4'} as CSSProperties}><span className="memory-play-back-label">A NOTE FROM ME TO YOU</span><p>{note||lines[choice]}</p><div key={animal} className="memory-note-preview-friend"><AnimalMascot animal={animal}/></div><span>{ko?'내가 기억하는 그날':'The day, as I remember it'}</span><span className="memory-note-preview-stamp" aria-hidden="true">♡</span></div></div>;
}
