"use client";
import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import type { MemoryItem } from './memories';
import MediaView from './media-view';
import { Icon, StitchIconFont, sansStack, stitchRoot } from './stitch-kit';
import type { FeedAlbum } from './home-feed';
import ThemeAlbum, { type AlbumStyle } from './theme-album';
import AlbumRollingPaper from './album-rolling-paper';
import {TripStoryAlbum} from './trip-story';

/** Shared album surface for the Stitch feed and photo drawer. */
export default function FeedAlbumView({ album, onBack, backLabel = '피드로 돌아가기', initialTab = 'album' }: { album: FeedAlbum; onBack: () => void; backLabel?: string; initialTab?: 'album' | 'paper' }) {
  const [tab, setTab] = useState<'album' | 'paper' | 'photos'>(initialTab);
  const [access, setAccess] = useState<{canEdit:boolean;canInvite:boolean;album:{story:boolean;description:string;endDate:string;style:AlbumStyle}} | null>(null);
  const [loadError,setLoadError]=useState(false),[reload,setReload]=useState(0);
  useEffect(() => {
    let active = true;
    api<NonNullable<typeof access>>(`/api/members?folderId=${encodeURIComponent(album.id)}`).then(result => { if (active) {setAccess(result);setLoadError(false);} }).catch(() => {if(active)setLoadError(true);});
    return () => { active = false; };
  }, [album.id,reload]);
  const [photo, setPhoto] = useState<MemoryItem | null>(null);
  return <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#fff8f5] text-[#30251f]">
    <header className={`${stitchRoot} sticky top-0 z-50 border-b border-[#efdfd5] bg-[#fff8f5]/95 px-5 py-4 backdrop-blur`} style={{ fontFamily: sansStack }}>
      <StitchIconFont/>
      <div className="mx-auto flex max-w-md items-center gap-3">
        <button type="button" autoFocus onClick={onBack} aria-label={backLabel} className="shrink-0 rounded-full bg-white p-2"><Icon name="arrow_back"/></button>
        <h1 className="stitch-serif min-w-0 truncate font-semibold text-[#99452c]">{album.name}</h1>
      </div>
    </header>
    <div className="mx-auto max-w-md px-4 pb-16 pt-3">
      <div role="tablist" aria-label="앨범 메뉴" className={`${stitchRoot} mb-3 flex gap-2 rounded-2xl bg-[#f3e5dc] p-1`}>
        <button type="button" role="tab" aria-selected={tab === 'album'} onClick={() => setTab('album')} className={`flex-1 rounded-xl px-3 py-3 text-xs font-semibold ${tab === 'album' ? 'bg-white text-[#99452c] shadow-sm' : 'text-[#78675e]'}`}>{access?.album.story?'우리 여행편':'앨범'}</button>
        {access?.album.story&&<button type="button" role="tab" aria-selected={tab==='photos'} onClick={()=>setTab('photos')} className={`flex-1 rounded-xl px-3 py-3 text-xs font-semibold ${tab==='photos'?'bg-white text-[#99452c] shadow-sm':'text-[#78675e]'}`}>사진 앨범</button>}
        <button type="button" role="tab" aria-selected={tab === 'paper'} onClick={() => setTab('paper')} className={`flex-1 rounded-xl px-3 py-3 text-xs font-semibold ${tab === 'paper' ? 'bg-white text-[#99452c] shadow-sm' : 'text-[#78675e]'}`}>롤링페이퍼</button>
      </div>
      {loadError&&<p role="alert" className="mb-3 text-sm">앨범 설정을 불러오지 못했어요. <button type="button" className="underline" onClick={()=>{setLoadError(false);setReload(n=>n+1);}}>다시 시도</button></p>}
      {tab === 'album'&&access?.album.story?<TripStoryAlbum folderId={album.id}/>:tab !== 'paper' ? access ? <ThemeAlbum key={`${album.id}:${access.album.style.theme}:${access.album.style.revealAt}`} folderId={album.id} title={album.name} description={access.album.description} locale="ko" browsing={false} birthday={album.category==='생일'?access.album.endDate:undefined} style={access.album.style} canShare={access.canInvite} onPhoto={setPhoto} owner={access.canEdit} onChanged={()=>setReload(n=>n+1)}/> : !loadError&&<p role="status" className="py-8 text-center text-sm">앨범을 준비하고 있어요…</p> : <AlbumRollingPaper folderId={album.id} title={album.name} locale="ko" canInvite={false} initiallyOpen rewardsEnabled/>}
    </div>
    {photo?.src && <div role="dialog" aria-modal="true" aria-label="사진 크게 보기" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3" onClick={() => setPhoto(null)}><button type="button" autoFocus aria-label="닫기" className="absolute right-4 top-4 rounded-full bg-white/15 px-4 py-3 text-white" onClick={() => setPhoto(null)}>닫기 ✕</button><MediaView src={photo.src} name={photo.body || album.name} mediaType={photo.mediaType} full/></div>}
  </div>;
}
