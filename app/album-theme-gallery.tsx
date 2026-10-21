'use client';
import { useState } from 'react';
import Link from 'next/link';
import ThemeAlbum from './theme-album';
import { albumTemplates } from '@/lib/memory-templates';
import { albumCategories, themeInCategory } from '@/lib/album-categories';
import { localAlbumPhotos } from '@/lib/local-album-photos';
import './album-theme-gallery.css';

const featured = ['passport','recipe','wedding','sports','blueprint','aquarium','camp','newspaper','yearbook','garden','tarot','desktop','postcard','parcel'];
const ordered = [...albumTemplates].sort((a,b)=>(featured.includes(a.albumTheme!)?featured.indexOf(a.albumTheme!):99)-(featured.includes(b.albumTheme!)?featured.indexOf(b.albumTheme!):99));
export default function AlbumThemeGallery(){
 const [category,setCategory]=useState('all');
 const [limit,setLimit]=useState(12);
 const selected=albumCategories.find(item=>item.id===category);
 const filtered=ordered.filter(item=>themeInCategory(item.albumTheme!,category));
 return <section className="album-theme-gallery" aria-labelledby="album-theme-gallery-title">
  <div className="memory-start-intro"><span>여행부터 평범한 하루까지 · {albumTemplates.length}가지 앨범</span><h1 id="album-theme-gallery-title">어떤 순간을<br/>모으고 있나요?</h1><p>떠난 날은 여권에, 맛있는 날은 레시피에.<br/>간직하고 싶은 순간에 어울리는 앨범을 찾아보세요.</p></div>
  <div className="album-category-grid" role="group" aria-label="앨범 카테고리">
   <button type="button" aria-pressed={category==='all'} onClick={()=>{setCategory('all');setLimit(12);}}><span>전체 테마</span><small>{albumTemplates.length}</small></button>
   {albumCategories.map(item=><button type="button" key={item.id} aria-pressed={category===item.id} onClick={()=>{setCategory(item.id);setLimit(12);}}><span>{item.ko}</span><small>{item.themes.length}</small></button>)}
  </div>
  <div className="album-category-heading" aria-live="polite"><div><h2>{selected?.ko || '새로운 테마부터 만나보세요'}</h2><p>{selected?.description || '사진이 담기는 방식까지 다른, 취향별 앨범 컬렉션'}</p></div><span>{filtered.length}종</span></div>
  <div className="album-theme-grid">{filtered.slice(0,limit).map(item=><Link key={item.id} href={`/make?template=${item.id}`} className="album-theme-option" aria-label={`${item.name} 앨범 만들기`}>
   <div className="album-theme-window" aria-hidden="true"><div className="album-theme-mini" inert><ThemeAlbum preview folderId={`preview-${item.id}`} title={item.title} description="" locale="ko" browsing={false} onPhoto={()=>{}} style={{theme:item.albumTheme!,song:'',revealAt:'',held:0,heldPeople:0}} localItems={localAlbumPhotos(item.photos.map(photo=>`/explore/album-samples/${photo}.jpg`))}/></div></div>
   <div className="album-theme-caption"><small className="album-theme-category">{albumCategories.find(group=>themeInCategory(item.albumTheme!,group.id))?.ko}</small><strong>{item.name}</strong><p>{item.description}</p><span>이 앨범으로 시작하기 →</span></div>
  </Link>)}</div>
  {limit<filtered.length&&<button type="button" className="album-themes-more" onClick={()=>setLimit(value=>value+12)}>테마 더 보기 · {filtered.length-limit}종 남음</button>}
  <p className="memory-start-reassurance">로그인 없이 내 사진으로 먼저 꾸며볼 수 있어요.</p>
  <Link href="/album-lab" className="album-lab-entry"><span>새로운 앨범 체험</span><strong>봉투에 담은 편지 · 함께 현상하는 필름</strong><small>편지함과 일회용 카메라 열어보기 →</small></Link>
 </section>;
}
