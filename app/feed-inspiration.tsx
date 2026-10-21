'use client';
/* eslint-disable @next/next/no-img-element -- Local editorial sample photos. */
import Link from 'next/link';
import ThemeAlbum from './theme-album';
import { albumTemplates } from '@/lib/memory-templates';
import { localAlbumPhotos } from '@/lib/local-album-photos';
import './feed-inspiration.css';

const suggestions=['album-passport','album-recipe','album-desktop'].map(id=>albumTemplates.find(item=>item.id===id)!);

export function FeedSampleStory(){
 return <article className="overflow-hidden rounded-2xl border border-[#efdfd5] bg-white shadow-sm" aria-label="앨범 예시: 아무 계획 없던 오후">
  <header className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3e5dc] text-lg" aria-hidden="true">☀</span><div><p className="text-sm font-semibold text-[#30251f]">아무 계획 없던 오후</p><p className="mt-1 text-[11px] text-[#88726c]">메모네스티아 에디터 · 앨범 예시</p></div></header>
  <img src="/explore/album-samples/cafe-friends.jpg" alt="카페에서 함께 시간을 보내는 친구들" className="aspect-[4/3] w-full object-cover"/>
  <div className="p-4"><h2 className="stitch-serif text-lg font-semibold text-[#30251f]">이런 날도 오래 남더라</h2><p className="mt-2 text-sm leading-6 text-[#78675e]">커피 한 잔 마시러 나왔다가 해 질 때까지.<br/>별일 없던 하루를 사진 몇 장으로 모아 봤어요.</p><Link href="/make?template=album-diary" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#f6e5db] px-4 text-xs font-semibold text-[#99452c]">이런 기록 남겨보기 <span aria-hidden="true">↗</span></Link></div>
 </article>;
}

export default function FeedInspiration(){
 return <section className="feed-theme-recommendations" aria-labelledby="feed-theme-title">
  <header><div><span>사진이 이야기가 되는 방법</span><h2 id="feed-theme-title">이런 앨범도 만들어봐요</h2></div><Link href="/make">테마 더 보기 <span aria-hidden="true">→</span></Link></header>
  <div className="feed-theme-rail">{suggestions.map(item=><Link key={item.id} href={`/make?template=${item.id}`} className="feed-theme-card" aria-label={`${item.name}으로 앨범 만들기`}><div className="feed-theme-preview" aria-hidden="true"><div inert><ThemeAlbum preview folderId={`feed-preview-${item.id}`} title={item.title} description="" locale="ko" browsing={false} onPhoto={()=>{}} style={{theme:item.albumTheme!,song:'',revealAt:'',held:0,heldPeople:0}} localItems={localAlbumPhotos(item.photos.map(photo=>`/explore/album-samples/${photo}.jpg`))}/></div></div><strong>{item.name}</strong><span>{item.albumTheme==='passport'?'다녀온 곳을 한 권에':item.albumTheme==='recipe'?'맛있는 날의 기록':'다시 열어보는 추억'}</span></Link>)}</div>
 </section>;
}
