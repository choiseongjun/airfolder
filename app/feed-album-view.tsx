"use client";
/* eslint-disable @next/next/no-img-element -- Images require the viewer's session. */
import './feed-album-view.css';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import type { FeedAlbum } from './home-feed';
import { AlbumRewardCover } from './reward-decoration';
import AlbumRollingPaper from './album-rolling-paper';
import { Icon, StitchIconFont, sansStack, stitchRoot } from './stitch-kit';

type Photo = { id: string; roomId: string; src: string; name: string; mediaType: string };
export default function FeedAlbumView({ album, onBack }: { album: FeedAlbum; onBack: () => void }) {
  const [tab, setTab] = useState<'decorate' | 'photos' | 'paper'>('decorate');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    api<{ photos: Photo[] }>('/api/workspace')
      .then(data => { if (active) setPhotos(data.photos.filter(photo => photo.roomId === album.id)); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [album.id]);
  return <div className={`${stitchRoot} h-screen overflow-y-auto bg-[#fff8f5] text-[#30251f]`} style={{ fontFamily: sansStack }}>
    <StitchIconFont/>
    <header className="sticky top-0 z-50 border-b border-[#efdfd5] bg-[#fff8f5]/95 px-5 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <button type="button" onClick={onBack} aria-label="피드로 돌아가기" className="rounded-full bg-white p-2"><Icon name="arrow_back"/></button>
        <span className="stitch-serif font-semibold text-[#99452c]">우리 앨범</span>
      </div>
    </header>
    <main className="mx-auto max-w-md space-y-5 px-5 pb-16 pt-5">
      <section className="overflow-hidden rounded-3xl border border-[#efdfd5] bg-white shadow-sm">
        {album.cover && <img src={album.cover} alt="" className="h-44 w-full object-cover"/>}
        <div className="p-5">
          <span className="text-xs text-[#94705e]">{album.category} · {album.photoCount}개의 조각</span>
          <h1 className="stitch-serif mt-2 text-2xl font-semibold">{album.name}</h1>
          <p className="mt-2 text-xs leading-5 text-[#78675e]">함께 모은 순간에 우리만의 캐릭터와 마음을 더해요.</p>
        </div>
      </section>
      <div role="group" aria-label="앨범 메뉴" className="flex gap-2 rounded-2xl bg-[#f3e5dc] p-1">
        {([{ id: 'decorate', name: '표지 꾸미기' }, { id: 'photos', name: '사진 조각' }, { id: 'paper', name: '스티커 롤링페이퍼' }] as const).map(item =>
          <button type="button" key={item.id} aria-pressed={tab === item.id} onClick={() => setTab(item.id)} className={`flex-1 rounded-xl px-2 py-3 text-xs font-semibold ${tab === item.id ? 'bg-white text-[#99452c] shadow-sm' : 'text-[#78675e]'}`}>{item.name}</button>)}
      </div>
      {tab === 'decorate' && <AlbumRewardCover folderId={album.id} ko owner/>}
      {tab === 'paper' && <AlbumRollingPaper folderId={album.id} title={album.name} locale="ko" canInvite={false} initiallyOpen rewardsEnabled/>}
      {tab === 'photos' && (loading ? <p role="status">사진을 불러오는 중…</p> : failed ? <p role="alert">사진을 불러오지 못했어요. 피드로 돌아갔다 다시 열어주세요.</p> : photos.length ? <div className="grid grid-cols-2 gap-3">
        {photos.map(photo => <figure key={photo.id} className="overflow-hidden rounded-xl border-4 border-white bg-white shadow-sm">
          {photo.mediaType === 'video' ? <video src={photo.src} controls playsInline className="aspect-[4/5] w-full object-cover"/> : <img src={photo.src} alt={photo.name || '앨범 사진'} loading="lazy" className="aspect-[4/5] w-full object-cover"/>}
          {photo.name && <figcaption className="truncate px-1 py-2 text-xs text-[#78675e]">{photo.name}</figcaption>}
        </figure>)}
      </div> : <p className="py-8 text-center text-sm">아직 모인 사진이 없어요.</p>)}
    </main>
  </div>;
}
