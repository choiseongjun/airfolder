"use client";
import { useState } from 'react';
import type { MemoryItem } from './memories';
import MediaView from './media-view';
import { Icon, StitchIconFont, sansStack, stitchRoot } from './stitch-kit';
import type { FeedAlbum } from './home-feed';
import ThemeAlbum from './theme-album';
import AlbumRollingPaper from './album-rolling-paper';

/** Feed album links open the same themed album surface used by the workspace. */
export default function FeedAlbumView({ album, onBack }: { album: FeedAlbum; onBack: () => void }) {
  const [tab, setTab] = useState<'album' | 'paper'>('album');
  const [photo, setPhoto] = useState<MemoryItem | null>(null);
  return <div className={`${stitchRoot} h-screen overflow-y-auto bg-[#fff8f5] text-[#30251f]`} style={{ fontFamily: sansStack }}>
    <StitchIconFont/>
    <header className="sticky top-0 z-50 border-b border-[#efdfd5] bg-[#fff8f5]/95 px-5 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <button type="button" onClick={onBack} aria-label="피드로 돌아가기" className="rounded-full bg-white p-2"><Icon name="arrow_back"/></button>
        <span className="stitch-serif font-semibold text-[#99452c]">{album.name}</span>
      </div>
    </header>
    <main className="mx-auto max-w-md px-4 pb-16 pt-3">
      <div role="tablist" aria-label="앨범 메뉴" className="mb-3 flex gap-2 rounded-2xl bg-[#f3e5dc] p-1">
        <button type="button" role="tab" aria-selected={tab === 'album'} onClick={() => setTab('album')} className={`flex-1 rounded-xl px-3 py-3 text-xs font-semibold ${tab === 'album' ? 'bg-white text-[#99452c] shadow-sm' : 'text-[#78675e]'}`}>앨범</button>
        <button type="button" role="tab" aria-selected={tab === 'paper'} onClick={() => setTab('paper')} className={`flex-1 rounded-xl px-3 py-3 text-xs font-semibold ${tab === 'paper' ? 'bg-white text-[#99452c] shadow-sm' : 'text-[#78675e]'}`}>롤링페이퍼</button>
      </div>
      {tab === 'album' ? <ThemeAlbum folderId={album.id} title={album.name} description="" locale="ko" browsing={false} canShare onPhoto={setPhoto} owner/> : <AlbumRollingPaper folderId={album.id} title={album.name} locale="ko" canInvite={false} initiallyOpen rewardsEnabled/>}
    </main>
    {photo?.src && <div role="dialog" aria-modal="true" aria-label="사진 크게 보기" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3" onClick={() => setPhoto(null)}><button type="button" autoFocus aria-label="닫기" className="absolute right-4 top-4 rounded-full bg-white/15 px-4 py-3 text-white" onClick={() => setPhoto(null)}>닫기 ✕</button><MediaView src={photo.src} name={photo.body || album.name} mediaType={photo.mediaType} full/></div>}
  </div>;
}
