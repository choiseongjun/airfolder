'use client';
import Link from 'next/link';
import {useState} from 'react';
import ThemeAlbum from './theme-album';
import { albumTemplates } from '@/lib/memory-templates';
import { localAlbumPhotos } from '@/lib/local-album-photos';
import './feed-inspiration.css';

const suggestions=['album-passport','album-recipe','album-desktop'].map(id=>albumTemplates.find(item=>item.id===id)!);

export function FeedSampleStory(){
 const [open,setOpen]=useState(false);
 return <article className="travel-feed-story" aria-label="여행 앨범 예시">
  <header><span>여행 앨범 예시 · 샘플 사진</span><h2>여행은 끝나도,<br/>우리 사진은 한곳에.</h2><p>사진 몇 장이면 이런 앨범이 돼요.<br/>우선 내 사진으로 바꿔서 구경해 보세요.</p></header>
  <Link href="/make?template=album-ticket" className="travel-album-preview" aria-label="이 앨범을 내 사진으로 바꾸기"><div inert><ThemeAlbum preview folderId="travel-cover-example" title="우리의 여행" description="다음에도 같이 가자." locale="ko" browsing={false} onPhoto={()=>{}} style={{theme:'ticket',song:'',revealAt:'',held:0,heldPeople:0}} localItems={localAlbumPhotos(['/landing/sea.webp','/landing/friends.webp'])}/></div></Link>
  <div className="travel-feed-content"><ol><li><b>1</b> 내 사진 고르기</li><li><b>2</b> 완성된 앨범 보기</li></ol><Link className="travel-feed-create" href="/make?template=album-ticket">내 사진으로 바꾸기 →</Link><p className="travel-feed-hint">사진 1장부터 · 로그인 없이 미리보기</p><button type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{open?'예시 앨범 접기':'완성된 예시 앨범 펼쳐보기'} {open?'−':'＋'}</button></div>
  {open&&<ThemeAlbum preview folderId="travel-feed-example" title="우리의 여행" description="다음에도 같이 가자." locale="ko" browsing={false} onPhoto={()=>{}} style={{theme:'ticket',song:'',revealAt:'',held:0,heldPeople:0}} localItems={localAlbumPhotos(['/landing/sea.webp','/landing/friends.webp'])}/>}
 </article>;
}

export default function FeedInspiration(){
 return <section className="feed-theme-recommendations" aria-labelledby="feed-theme-title">
  <header><div><span>사진이 이야기가 되는 방법</span><h2 id="feed-theme-title">이런 앨범도 만들어봐요</h2></div><Link href="/make">테마 더 보기 <span aria-hidden="true">→</span></Link></header>
  <div className="feed-theme-rail">{suggestions.map(item=><Link key={item.id} href={`/make?template=${item.id}`} className="feed-theme-card" aria-label={`${item.name}으로 앨범 만들기`}><div className="feed-theme-preview" aria-hidden="true"><div inert><ThemeAlbum preview folderId={`feed-preview-${item.id}`} title={item.title} description="" locale="ko" browsing={false} onPhoto={()=>{}} style={{theme:item.albumTheme!,song:'',revealAt:'',held:0,heldPeople:0}} localItems={localAlbumPhotos(item.photos.map(photo=>`/explore/album-samples/${photo}.jpg`))}/></div></div><strong>{item.name}</strong><span>{item.albumTheme==='passport'?'다녀온 곳을 한 권에':item.albumTheme==='recipe'?'맛있는 날의 기록':'다시 열어보는 추억'}</span></Link>)}</div>
 </section>;
}
