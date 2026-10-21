'use client';
import { useState } from 'react';
import Link from 'next/link';
import ThemeAlbum from './theme-album';
import { albumTemplates } from '@/lib/memory-templates';
import { localAlbumPhotos } from '@/lib/local-album-photos';
import './album-theme-gallery.css';

const featured = ['desktop','tarot','metro','detective','quest','cinema'];
const ordered = [...albumTemplates].sort((a,b)=>(featured.includes(a.albumTheme!)?featured.indexOf(a.albumTheme!):99)-(featured.includes(b.albumTheme!)?featured.indexOf(b.albumTheme!):99));
export default function AlbumThemeGallery(){
 const [all,setAll]=useState(false);
 return <section className="album-theme-gallery" aria-labelledby="album-theme-gallery-title">
  <div className="memory-start-intro"><span>평범한 사진첩으로는 아쉬우니까</span><h1 id="album-theme-gallery-title">사진으로 여는<br/>뜻밖의 세계.</h1><p>추억.zip을 열고, 운명의 카드를 뒤집고, 그날의 사건을 추적해 보세요.<br/>사진을 간직하는 {albumTemplates.length}가지 전혀 다른 방법.</p></div>
  <Link href="/album-lab" className="album-lab-entry"><span>새로운 앨범 체험</span><strong>봉투에 담은 편지 · 함께 현상하는 필름</strong><small>편지함과 일회용 카메라 열어보기 →</small></Link>
  <div className="album-theme-grid">{(all?ordered:ordered.slice(0,6)).map(item=><Link key={item.id} href={`/make?template=${item.id}`} className="album-theme-option" aria-label={`${item.name} 앨범 만들기`}>
   <div className="album-theme-window" aria-hidden="true"><div className="album-theme-mini" inert><ThemeAlbum preview folderId={`preview-${item.id}`} title={item.title} description="" locale="ko" browsing={false} onPhoto={()=>{}} style={{theme:item.albumTheme!,song:'',revealAt:'',held:0,heldPeople:0}} localItems={localAlbumPhotos(item.photos.map(photo=>`/explore/album-samples/${photo}.jpg`))}/></div></div>
   <div className="album-theme-caption"><strong>{item.name}</strong><p>{item.description}</p><span>이 앨범으로 시작하기 →</span></div>
  </Link>)}</div>
  <button className="album-themes-more" onClick={()=>setAll(!all)} aria-expanded={all}>{all?'대표 테마만 보기':`앨범 테마 ${albumTemplates.length}가지 모두 보기`}</button>
  <p className="memory-start-reassurance">로그인 없이 내 사진으로 먼저 꾸며볼 수 있어요.</p>
 </section>;
}
