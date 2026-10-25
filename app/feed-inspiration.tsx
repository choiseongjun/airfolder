'use client';
import {useCrewLocale,useCrewText} from './crew-locale';
import Link from 'next/link';
import {useState} from 'react';
import ThemeAlbum from './theme-album';
import {StoryCards} from './trip-story';
import { albumTemplates } from '@/lib/memory-templates';
import { localAlbumPhotos } from '@/lib/local-album-photos';
import './feed-inspiration.css';

const englishSamples:Record<string,{name:string;title:string}>={'album-passport':{name:'Memory passport',title:'A stamp on the heart'},'album-recipe':{name:'Recipe for happiness',title:'A spoonful of laughter'},'album-desktop':{name:'Memories.zip',title:'Opening last summer.zip'}};
const suggestions=['album-passport','album-recipe','album-desktop'].map(id=>albumTemplates.find(item=>item.id===id)!);

export function FeedSampleStory(){
 const ct=useCrewText();const locale=useCrewLocale();
 const [open,setOpen]=useState(false);
 return <article className="travel-feed-story" aria-label={ct("여행 앨범 예시")}>
  <header><span>{ct("각자가 기억하는 같은 여행")}</span><h2>{ct("같이 다녀왔지만,")}<br/>{ct("기억은 다 다르니까.")}</h2><p>{ct("나는 바다가 기억나고, 너는 그때 웃었던 게 기억나지?")}<br/>{ct("각자의 사진과 한마디로 우리 여행편을 만들어요.")}</p></header>
  <div className="travel-feed-content"><ol><li><b>1</b>  {ct("내 사진과 기억")}</li><li><b>2</b>  {ct("친구의 한 장")}</li><li><b>3</b>  {ct("우리의 여행편")}</li></ol><Link className="travel-feed-create" href={`/make?lang=${locale}&occasion=travel`}>{ct("우리 여행편 시작하기 →")}</Link><p className="travel-feed-hint">{ct("사진 1~3장으로 시작 · 친구는 사진 한 장과 한마디")}</p><button type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?ct("예시 접기"):ct("함께 만든 여행편은 이런 모습이에요")} {open?'−':'＋'}</button></div>
  {open&&<div className="trip-story travel-feed-content"><p className="travel-feed-hint">{ct("아래 사진과 한마디는 예시입니다.")}</p><StoryCards title={ct("부산에서 보낸 주말")} entries={[{id:'sample-1',personId:'sample-1',name:ct("지우"),body:ct("길 잘못 들어서 우연히 찾은 바다가 제일 좋았어 ㅋㅋ"),animal:'cat',avatar:null,mine:false,photos:[{id:'sample-sea',src:'/landing/sea.webp'}]},{id:'sample-2',personId:'sample-2',name:ct("서연"),body:ct("나는 다 같이 뛰다가 신발에 모래 들어간 순간. 아직도 웃겨!"),animal:'rabbit',avatar:null,mine:false,photos:[{id:'sample-friends',src:'/landing/friends.webp'}]}]}/></div>}
 </article>;
}

export default function FeedInspiration(){
 const ct=useCrewText();
 const locale=useCrewLocale();
 return <section className="feed-theme-recommendations" aria-labelledby="feed-theme-title">
  <header><div><span>{ct("사진이 이야기가 되는 방법")}</span><h2 id="feed-theme-title">{ct("이런 앨범도 만들어봐요")}</h2></div><Link href={`/make?lang=${locale}&themes=1`}>{ct("테마 더 보기")} <span aria-hidden="true">→</span></Link></header>
  <div className="feed-theme-rail">{suggestions.map(item=><Link key={item.id} href={`/make?lang=${locale}&template=${item.id}`} className="feed-theme-card" aria-label={locale==='en'?`Create a ${englishSamples[item.id].name} album`:`${item.name}으로 앨범 만들기`}><div className="feed-theme-preview" aria-hidden="true"><div inert><ThemeAlbum preview folderId={`feed-preview-${item.id}`} title={locale==='en'?englishSamples[item.id].title:item.title} description="" locale={locale} browsing={false} onPhoto={()=>{}} style={{theme:item.albumTheme!,song:'',revealAt:'',held:0,heldPeople:0}} localItems={localAlbumPhotos(item.photos.map(photo=>`/explore/album-samples/${photo}.jpg`))}/></div></div><strong>{locale==='en'?englishSamples[item.id].name:item.name}</strong><span>{item.albumTheme==='passport'?ct("다녀온 곳을 한 권에"):item.albumTheme==='recipe'?ct("맛있는 날의 기록"):ct("다시 열어보는 추억")}</span></Link>)}</div>
 </section>;
}
