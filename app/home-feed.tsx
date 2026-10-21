"use client";
/* eslint-disable @next/next/no-img-element -- Photo URLs need the viewer's session cookie; an optimizer cannot fetch them. */
import Link from 'next/link';
import { joinedAlbumHref } from '@/lib/album-navigation';
import { createPortal } from 'react-dom';
import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Trash2, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { TERMS_VERSION } from '@/lib/policy';
import { Icon, StitchIconFont, sansStack, stitchRoot } from './stitch-kit';
import { RollingPaper } from './rolling-paper';
import QuickAlbum from './quick-album';
import FeedAlbumView from './feed-album-view';
import MemoryLoading from './memory-loading';
import BrandMark from './brand-mark';
import PhotoNotes from './photo-notes';
import type { NoteColor, NoteOptions } from '@/lib/comment-note';
import FeedInspiration, { FeedSampleStory } from './feed-inspiration';

// One feed home for first-time visitors and existing crews. Editorial examples
// are explicitly labelled and never mixed into the viewer's private records.
type Person = { id: string; name: string; mine: boolean };
type Media = { id: string; src: string; video: boolean; day: string | null };
export type FeedItem = { kind: 'photo' | 'record'; id: string; folderId: string; album: string; author: Person; createdAt: string; title: string; body: string; photos: Media[]; photoCount: number; comments: { id: string; body: string; author: Person; createdAt: string; color?: NoteColor; photoId?: string }[]; commentCount: number; likes: number; liked: boolean; shared: boolean; recipients: string[]; revision: number; day: string };
export type FeedAlbum = {id:string;name:string;category:string;photoCount:number;cover:string|null;updatedAt:string};
export type FeedData = { me: string; groups: { id: string; name: string; members: number; mine:boolean; ownerName:string;isPublic:boolean }[]; publicGroups?:{id:string;name:string;description:string;ownerName:string;members:number}[]; albums:FeedAlbum[]; crew: { id: string | null; name: string | null; ownerId: string | null; members: Person[] }; month: { count: number; today: number; goal: number; contributors: Person[] }; items: FeedItem[] };

const STORAGE_KEY = 'memonestia.feedGroup';
const avatarTones = ['bg-[#bf9061] text-[#492a04]', 'bg-[#f0dfd5] text-[#55433d]', 'bg-[#ffb5a0] text-[#3b0900]', 'bg-[#c2e9c9] text-[#486a51]'];
const tone = (person: Person) => person.mine ? 'bg-[#99452c] text-[#ffffff]' : avatarTones[[...person.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % avatarTones.length];
const initial = (person: Person) => person.mine ? '나' : [...person.name.trim()][0] || '?';
const label = 'stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em]';

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

export type FeedActions = { onSelectGroup: (id: string | null) => void; onCreateGroup?: (name: string,isPublic?:boolean) => Promise<void>; onJoinPublicGroup?:(id:string)=>Promise<void>; onLike: (item: FeedItem) => void; onComment: (item: FeedItem, body: string, options?: NoteOptions) => Promise<string | null>; onDelete: (item: FeedItem) => Promise<string | null>; onRefresh?: () => void; onOpenBundle?: (item: FeedItem, mode: 'gallery' | 'slideshow') => void };

function SpacePickerModal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    node?.showModal();
    return () => { node?.close(); trigger?.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby="space-picker-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-[420px] max-h-[80dvh] overflow-hidden rounded-3xl border border-[#efdfd5] bg-[#fffaf7] p-0 text-[#30251f] shadow-2xl backdrop:bg-[#30251f]/40 backdrop:backdrop-blur-sm">
    <div className="flex items-start justify-between gap-4 border-b border-[#efdfd5] px-5 py-4"><div><h2 id="space-picker-title" className="stitch-serif text-xl font-semibold">어디로 갈까요?</h2><p className="mt-1 text-xs text-[#78675e]">함께 추억을 모을 공간을 선택하세요.</p></div><button type="button" autoFocus aria-label="공간 선택 닫기" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f6e5db] text-[#99452c]"><X size={18} aria-hidden="true"/></button></div>
    <div className="max-h-[calc(80dvh-100px)] overflow-y-auto overscroll-contain p-3">{children}</div>
  </dialog>;
}

export function CrewFeedView({ data, actions }: { data: FeedData; actions: FeedActions }) {
  const [picking, setPicking] = useState(false);
  const [openedAlbum, setOpenedAlbum] = useState<FeedAlbum | null>(null);
  const [fullBundle, setFullBundle] = useState<{ item: FeedItem; mode: 'gallery' | 'slideshow' } | null>(null);
  const [creatingSpace, setCreatingSpace] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [spacePublic, setSpacePublic] = useState(false);
  const [joiningSpace, setJoiningSpace] = useState<string|null>(null);
  const [spaceError, setSpaceError] = useState('');
  const [spaceBusy, setSpaceBusy] = useState(false);
  const [termsGate, setTermsGate] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsBusy, setTermsBusy] = useState(false);
  const [shareNotice, setShareNotice] = useState('');
  const { crew } = data;
  const guest = !data.me;
  const publicGroups = data.publicGroups ?? [];
  useEffect(() => {
    const syncAlbumFromUrl = () => {
      const id = new URLSearchParams(window.location.search).get('album');
      setOpenedAlbum(id ? data.albums.find(album => album.id === id) ?? null : null);
    };
    syncAlbumFromUrl();
    window.addEventListener('popstate', syncAlbumFromUrl);
    return () => window.removeEventListener('popstate', syncAlbumFromUrl);
  }, [data.albums]);
  function openAlbum(album: FeedAlbum) {
    const url = new URL(window.location.href);
    url.searchParams.set('group', crew.id ?? 'personal');
    url.searchParams.set('album', album.id);
    url.searchParams.delete('view'); url.searchParams.delete('photo');
    window.history.pushState({ ...(window.history.state || {}), feedAlbumId: album.id }, '', url);
    setOpenedAlbum(album);
  }
  function closeAlbum() {
    if (window.history.state?.feedAlbumId) { window.history.back(); return; }
    const url = new URL(window.location.href);
    url.searchParams.delete('album'); url.searchParams.delete('view'); url.searchParams.delete('photo');
    window.history.replaceState(null, '', url);
    setOpenedAlbum(null);
  }
  const crewHref = '/crew/settings';
  const currentGroup = crew.id ?? 'personal';
  const screenHref = (next: 'home'|'photos'|'behind'|'settings') => guest && next !== 'home' ? '/?lang=ko&login=1' : next === 'home' ? `/?lang=ko&home=1&group=${encodeURIComponent(currentGroup)}` : `/crew/${next}?group=${encodeURIComponent(currentGroup)}`;
  const createAlbumHref = `/?lang=ko&quick=1&group=${encodeURIComponent(currentGroup)}&returnTo=${encodeURIComponent(`/?lang=ko&home=1&group=${encodeURIComponent(currentGroup)}`)}`;
  const items = data.items;
  const invite = crew.id && <Link href={`${crewHref}?group=${encodeURIComponent(crew.id)}`} className="flex items-center gap-1.5 bg-[#f6e5db] hover:bg-[#f0dfd5] transition-colors px-2.5 py-1.5 rounded-full shrink-0 text-[#55433d] active:scale-95"><div className="w-6 h-6 rounded-full border-2 border-dashed border-[#88726c] flex items-center justify-center text-[#99452c]"><Icon name="person_add" className="text-[14px]"/></div><span className={`${label} font-medium`}>+ 친구 초대</span></Link>;
  async function shareSpace() {
    const url = new URL(window.location.href);
    url.searchParams.set('group', crew.id ?? 'personal');
    url.searchParams.set('home', '1');
    try {
      if (navigator.share) await navigator.share({ title: `${crew.name ?? '내 개인 공간'} · 메모네스티아`, text: '참여 중인 공간 피드를 확인해 보세요.', url: url.toString() });
      else { await navigator.clipboard.writeText(url.toString()); setShareNotice('공간 피드 주소를 복사했어요.'); window.setTimeout(() => setShareNotice(''), 2400); }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setShareNotice('공유를 열지 못했어요. 초대 버튼에서 멤버를 초대할 수 있어요.');
      window.setTimeout(() => setShareNotice(''), 3200);
    }
  }
  if (openedAlbum) return <FeedAlbumView key={openedAlbum.id} album={openedAlbum} onBack={closeAlbum}/>;
  if (fullBundle) return <FullBundleView item={fullBundle.item} initialMode={fullBundle.mode} onBack={() => setFullBundle(null)} actions={actions}/>;
  return <div className={`${stitchRoot} crew-feed-shell h-screen overflow-y-auto bg-[#fff8f5] text-[#221a14] antialiased`} style={{ fontFamily: sansStack }}>
    <StitchIconFont/>
    <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-[#efdfd5] bg-[#fff8f5]/95 pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-2 px-5 pb-2 pt-2 md:max-w-[1200px] md:px-8 md:pb-3 md:pt-3">
        <div className="flex h-10 items-center justify-between gap-3">
          <Link href={`/?lang=ko&home=1&group=${encodeURIComponent(crew.id ?? "personal")}`} aria-label="메모네스티아 홈" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><BrandMark/></Link>
          <div className="flex shrink-0 items-center gap-1">{guest?<Link href="/?lang=ko&login=1" className="rounded-full bg-[#99452c] px-4 py-2 text-xs font-semibold text-white">로그인</Link>:<><button type="button" onClick={() => void shareSpace()} aria-label="공간 피드 공유" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#78675e] hover:bg-[#f6e5db]"><Icon name="share" className="text-[21px]"/></button><Link href="/crew/settings" aria-label="계정 및 크루 설정" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#99452c] shadow-[0_2px_8px_rgba(153,69,44,0.2)]"><Icon name="person" className="text-[#ffffff] text-[18px]"/></Link></>}</div>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          {guest?<div className="py-1"><span className="stitch-serif text-base font-semibold">메모네스티아</span><p className="mt-1 text-[10px] text-[#78675e]">작은 순간을 모으는 곳</p></div>:<button type="button" aria-expanded={picking} aria-haspopup="dialog" onClick={() => setPicking(v => !v)} className="group flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-[#fff1e9]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f6e5db] text-[#99452c]"><Icon name={crew.id ? 'groups' : 'person'} className="text-[18px]"/></span><span className="min-w-0"><span className="stitch-serif block truncate text-[1rem] font-semibold text-[#221a14]">{crew.name ?? '내 개인 공간'}</span><span className="block truncate text-[10px] text-[#78675e]">{crew.id ? `${crew.members.length}명 · ${data.groups.find(group => group.id === crew.id)?.mine ? '내가 만든 공간' : '초대받은 공간'}` : '눌러서 다른 크루로 이동'}</span></span><Icon name="expand_more" className="shrink-0 text-[18px] text-[#55433d] transition-transform group-hover:translate-y-0.5"/>
          </button>}
          {invite}

        </div>
        {crew.id && <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" aria-label="크루 멤버">
          {crew.members.map(m => <div key={m.id} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-2 py-1"><div className={`flex h-6 w-6 items-center justify-center rounded-full ${label} ${m.mine ? 'font-bold' : 'font-[500]'} ${tone(m)}`}>{initial(m)}</div><span className="text-[10px] text-[#55433d]">{m.mine ? '나' : m.name}</span></div>)}
        </div>}
        {shareNotice && <p role="status" className="absolute right-4 top-full mt-2 rounded-xl bg-[#30251f] px-3 py-2 text-xs text-white shadow-lg md:right-8">{shareNotice}</p>}
      </div>
    </header>
    {picking && <SpacePickerModal onClose={() => setPicking(false)}>
              <button type="button" aria-pressed={crew.id === null} onClick={() => { setPicking(false); actions.onSelectGroup(null); }} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#fcebe0] ${crew.id === null ? 'bg-[#fff1e9] font-bold text-[#99452c]' : 'text-[#221a14]'}`}><span><span className="block truncate text-sm">내 개인 공간</span><span className="mt-0.5 block text-[10px] font-normal text-[#88726c]">개인 앨범과 초대받은 추억</span></span><span className={`${label} shrink-0 text-[#88726c]`}>개인</span></button>
              {data.groups.some(group => group.mine) && <><p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#88726c]">내가 만든 공간</p>{data.groups.filter(group => group.mine).map(g => <button key={g.id} type="button" aria-pressed={g.id === crew.id} onClick={() => { setPicking(false); actions.onSelectGroup(g.id); }} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#fcebe0] ${g.id === crew.id ? 'bg-[#fff1e9] font-bold text-[#99452c]' : 'text-[#221a14]'}`}><span className="min-w-0"><span className="block truncate text-sm">{g.name}</span><span className="mt-0.5 block truncate text-[10px] font-normal text-[#88726c]">내가 만든 공간 · 멤버 {g.members}명</span></span><Icon name={g.id === crew.id ? "check_circle" : "chevron_right"} className="shrink-0 text-lg text-[#99452c]"/></button>)}</>}
              {data.groups.some(group => !group.mine) && <><p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#88726c]">초대받은 공간</p>{data.groups.filter(group => !group.mine).map(g => <button key={g.id} type="button" aria-pressed={g.id === crew.id} onClick={() => { setPicking(false); actions.onSelectGroup(g.id); }} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#fcebe0] ${g.id === crew.id ? 'bg-[#fff1e9] font-bold text-[#99452c]' : 'text-[#221a14]'}`}><span className="min-w-0"><span className="block truncate text-sm">{g.name}</span><span className="mt-0.5 block truncate text-[10px] font-normal text-[#88726c]">{g.ownerName}님이 만든 공간 · 멤버 {g.members}명</span></span><Icon name={g.id === crew.id ? "check_circle" : "chevron_right"} className="shrink-0 text-lg text-[#99452c]"/></button>)}</>}
              {!data.groups.length && <p className="px-3 py-3 text-xs leading-5 text-[#78675e]">아직 참여 중인 공용 공간이 없어요. 친구의 초대 링크로 참여하면 이곳에 표시돼요.</p>}
              <details className="my-3 rounded-2xl border border-[#efdfd5] bg-white"><summary className="cursor-pointer px-3 py-3 text-xs font-semibold text-[#78675e]">다른 공개 공간 둘러보기</summary>
              {publicGroups.map(group=><div key={group.id} className="flex items-center gap-2 rounded-lg px-3 py-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f6e5db] text-[#99452c]"><Icon name="groups" className="text-base"/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{group.name}</span><span className="block truncate text-[10px] text-[#88726c]">{group.ownerName}님 · 멤버 {group.members}명</span></span><button type="button" disabled={!!joiningSpace} onClick={async()=>{if(!actions.onJoinPublicGroup)return;setJoiningSpace(group.id);setSpaceError('');try{await actions.onJoinPublicGroup(group.id);setPicking(false);}catch{setSpaceError('공간에 참여하지 못했어요. 다시 시도해 주세요.');}finally{setJoiningSpace(null);}}} className="shrink-0 rounded-full bg-[#99452c] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{joiningSpace===group.id?'참여 중…':'참여'}</button></div>)}
              {spaceError&&!creatingSpace&&<p role="alert" className="px-3 pb-2 text-xs text-[#a33b2f]">{spaceError}</p>}
              {!publicGroups.length&&<p className="px-3 pb-3 text-xs leading-5 text-[#78675e]">공개로 설정한 공간이 아직 없어요. 내 공간에서 공개 설정을 켜면 여기에 표시돼요.</p>}
              </details>
              {actions.onCreateGroup && <button type="button" onClick={() => { setPicking(false); setSpaceName(''); setSpacePublic(false); setSpaceError(''); setTermsGate(false); setTermsChecked(false); setCreatingSpace(true); }} className="flex items-center gap-2 border-t border-[#f0e4dc] px-3 py-2.5 text-left text-sm font-semibold text-[#99452c] hover:bg-[#fff1e9]"><Icon name="add_circle" className="text-lg"/>새 앨범 공간 만들기</button>}
    </SpacePickerModal>}
    <main className={`memory-feed-enter mx-auto flex min-h-screen w-full max-w-md flex-col relative bg-[#fff8f5] px-[1.25rem] pb-24 md:max-w-[1200px] md:px-8 ${crew.id ? 'pt-[calc(10.2rem+env(safe-area-inset-top,0px))] md:pt-[calc(10.2rem+env(safe-area-inset-top,0px))]' : 'pt-[calc(8.5rem+env(safe-area-inset-top,0px))] md:pt-[calc(8.5rem+env(safe-area-inset-top,0px))]'}`}>
      <div className="flex flex-col w-full pb-8">
        <div className="mb-5"><h1 className="stitch-serif text-2xl font-semibold text-[#30251f]">오늘의 피드</h1><p className="mt-2 text-xs leading-5 text-[#78675e]">{items.length?'함께 쌓아 온 순간들, 오늘도 이어봐요.':'소소한 하루부터 특별한 날까지, 천천히 둘러보세요.'}</p></div>
        {!!data.albums.length && <section className="mb-5" aria-label="공간 앨범">
          <div className="mb-2 flex items-center justify-between"><h2 id="feed-albums" className="stitch-serif scroll-mt-24 text-base font-semibold text-[#30251f]">최근 앨범</h2><span className="text-[10px] text-[#78675e]">{data.albums.length}개</span></div>
          {data.albums.length ? <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">{data.albums.map(album=><button type="button" key={album.id} onClick={()=>openAlbum(album)} className="text-left w-48 shrink-0 overflow-hidden rounded-xl border border-[#efdfd5] bg-white shadow-[0_3px_12px_rgba(112,100,92,.07)]"><div className="aspect-[4/3] bg-[#f3e5dc]">{album.cover?<img src={album.cover} alt="" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-3xl text-[#b89170]">📖</div>}</div><div className="p-2.5"><strong className="block truncate text-xs text-[#30251f]">{album.name}</strong><span className="mt-1 block text-[10px] text-[#78675e]">사진 {album.photoCount}장 · 앨범 열기</span></div></button>)}</div> : <p className="rounded-xl bg-white/80 px-3 py-3 text-[11px] text-[#78675e]">아직 앨범이 없어요. 사진을 담으면 이곳에서 바로 볼 수 있어요.</p>}
        </section>}
        {!!items.length && <div className="mb-4 mt-3"><h2 className="stitch-serif text-lg font-semibold text-[#30251f]">최근 기록</h2><p className="mt-1 text-xs leading-5 text-[#78675e]">이 공간에서 볼 수 있는 최근 기록 12개예요. 이전 사진은 앨범에서 이어보세요.</p></div>}
        <div className="mx-auto flex w-full max-w-[780px] flex-col gap-6">
          {items.map((item, index) => <Fragment key={item.kind + item.id}><FeedCard item={item} index={index} groupId={crew.id} owner={crew.ownerId} actions={{...actions,onOpenBundle:(bundle,mode)=>setFullBundle({item:bundle,mode})}}/>{index===0&&<FeedInspiration/>}</Fragment>)}
          {!items.length && <><FeedSampleStory/><FeedInspiration/><div className="rounded-2xl border border-[#efdfd5] bg-white p-5"><h2 className="stitch-serif text-base font-semibold">여기에 내 이야기도 쌓아봐요</h2><p className="mt-2 text-xs leading-5 text-[#78675e]">위 기록은 둘러보기용 예시예요. 내 사진을 담으면 이 피드에서 바로 이어볼 수 있어요.</p>{guest&&<Link href="/?lang=ko&login=1&returnTo=%2F%3Flang%3Dko%26home%3D1" className="mt-3 inline-block py-2 text-xs font-semibold text-[#99452c]">이미 쓰고 있다면 로그인 →</Link>}</div></>}
        </div>
        <div className="mt-6 self-center w-full max-w-sm px-2">
          <Link href={createAlbumHref} className="w-full flex items-center justify-center gap-2 bg-[#99452c] hover:bg-[#7b2e17] text-[#ffffff] py-3 px-5 rounded-2xl shadow-[0_8px_24px_rgba(153,69,44,0.35)] active:scale-98 transition-all group">
            <Icon name="photo_camera" className="text-[20px] transition-transform group-hover:rotate-[-8deg]"/>
            <span className="stitch-sans text-[0.875rem] leading-[1.25rem] font-[600] tracking-wide">새 추억 앨범 만들기</span><span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">최대 30장</span>
          </Link>
        </div>
      </div>
    </main>
    <nav className="fixed inset-x-0 bottom-0 z-50 w-full border-t border-[#efdfd5] bg-[#fff8f5]/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_12px_rgba(112,100,92,0.06)] backdrop-blur-xl md:border-x md:border-t md:border-[#efdfd5]" aria-label="주요 메뉴">
      <div className="mx-auto grid h-16 w-full max-w-[480px] grid-cols-5 items-center px-2 md:h-[4.5rem] md:max-w-[1200px] md:px-8">
        {[{ href: screenHref('home'), icon: 'cottage', text: '홈 피드', current: true }, { href: screenHref('photos'), icon: 'photo_library', text: '사진 서랍' }].map(tab =>
          <Link key={tab.text} href={tab.href} aria-current={tab.current ? 'page' : undefined} className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${tab.current ? 'text-[#99452c] font-bold' : 'text-[#55433d] hover:text-[#221a14]'}`}><Icon name={tab.icon} className="text-[22px]"/><span className={`${label} font-[500]`}>{tab.text}</span></Link>)}
        <Link href={createAlbumHref} aria-label="새 앨범 만들기" className="-mt-4 flex flex-col items-center justify-center gap-0.5 text-[#99452c]"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#99452c] text-white shadow-[0_5px_14px_rgba(153,69,44,.3)]"><Icon name="add_circle" className="text-[25px]"/></span><span className={`${label} font-semibold`}>앨범 생성</span></Link>
        {[{ href: screenHref('behind'), icon: 'sticky_note_2', text: '비하인드' }, { href: screenHref('settings'), icon: 'settings', text: '크루 설정' }].map(tab =>
          <Link key={tab.text} href={tab.href} className="flex flex-col items-center justify-center gap-0.5 text-[#55433d] transition-colors hover:text-[#221a14]"><Icon name={tab.icon} className="text-[22px]"/><span className={`${label} font-[500]`}>{tab.text}</span></Link>)}
      </div>
    </nav>
    {creatingSpace && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#30251f]/55 px-5" onMouseDown={event => { if(event.target===event.currentTarget&&!spaceBusy&&!termsBusy)setCreatingSpace(false); }}><section role="dialog" aria-modal="true" aria-labelledby="new-space-title" className="w-full max-w-sm rounded-2xl border border-[#efdfd5] bg-[#fff8f5] p-5 shadow-2xl"><div className="mb-4 flex items-start justify-between gap-3"><div><span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#99452c]">New album space</span><h2 id="new-space-title" className="stitch-serif mt-1 text-xl font-semibold text-[#30251f]">새 앨범 공간 만들기</h2><p className="mt-1 text-xs leading-5 text-[#78675e]">가족, 친구, 여행처럼 함께 기록할 사람들별로 공간을 만들어요.</p></div><button type="button" aria-label="닫기" disabled={spaceBusy||termsBusy} onClick={()=>setCreatingSpace(false)} className="rounded-lg px-2 py-1 text-[#78675e] hover:bg-[#f6e5db]">✕</button></div>{termsGate ? <div className="space-y-4"><div className="rounded-xl border border-[#e6d6ca] bg-white p-4"><p className="text-sm font-semibold text-[#30251f]">공간을 만들기 전에 동의가 필요해요</p><p className="mt-1 text-xs leading-5 text-[#78675e]">아래 문서를 확인한 뒤 체크하고 동의해 주세요. 동의 후 이 창으로 돌아와 공간을 만들 수 있어요.</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold"><Link className="text-[#99452c] underline underline-offset-2" href="/terms" target="_blank">이용약관 · 커뮤니티 규칙 보기 ↗</Link><Link className="text-[#99452c] underline underline-offset-2" href="/privacy" target="_blank">개인정보 처리 안내 보기 ↗</Link></div><label className="mt-4 flex cursor-pointer items-start gap-2.5 border-t border-[#f0e4dc] pt-3 text-xs leading-5 text-[#55433d]"><input type="checkbox" checked={termsChecked} onChange={event=>setTermsChecked(event.target.checked)} className="mt-1 accent-[#99452c]"/><span>이용약관과 커뮤니티 규칙에 동의하고 개인정보 처리 안내를 확인했습니다.</span></label></div>{spaceError&&<p role="alert" className="text-xs text-[#a33b2f]">{spaceError}</p>}<button type="button" disabled={!termsChecked||termsBusy} onClick={async()=>{setTermsBusy(true);setSpaceError('');try{await api('/api/policy',{method:'POST',body:JSON.stringify({version:TERMS_VERSION,accepted:true})});setTermsGate(false);setTermsChecked(false);}catch{setSpaceError('동의를 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');}finally{setTermsBusy(false);}}} className="w-full rounded-xl bg-[#99452c] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{termsBusy?'동의 저장 중…':'동의하고 공간 만들기로 돌아가기'}</button></div> : <form onSubmit={async event=>{event.preventDefault();if(!spaceName.trim()||!actions.onCreateGroup)return;setSpaceBusy(true);setSpaceError('');try{await actions.onCreateGroup(spaceName.trim(),spacePublic);setCreatingSpace(false);setSpaceName('');}catch(error){if(error instanceof Error&&error.message==='TERMS_REQUIRED'){setTermsGate(true);setSpaceError('');}else setSpaceError(error instanceof Error&&error.message==='GROUP_LIMIT'?'만들 수 있는 공간 수(50개)에 도달했어요.':'공간을 만들지 못했어요. 잠시 후 다시 시도해 주세요.');}finally{setSpaceBusy(false);}}} className="space-y-3"><label className="block text-xs font-semibold text-[#55433d]">공간 이름<input autoFocus required maxLength={80} value={spaceName} onChange={event=>setSpaceName(event.target.value)} placeholder="예: 우리 가족, 대학 친구들" className="mt-1.5 w-full rounded-xl border border-[#e6d6ca] bg-white px-3 py-3 text-sm text-[#30251f] outline-none focus:border-[#99452c]"/></label><label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#e6d6ca] bg-white p-3 text-xs leading-5 text-[#55433d]"><input type="checkbox" checked={spacePublic} onChange={event=>setSpacePublic(event.target.checked)} className="mt-0.5 accent-[#99452c]"/><span><strong className="block text-[#30251f]">공개 공간 둘러보기에 등록</strong><span className="text-[#78675e]">공간 이름, 만든 사람, 멤버 수가 표시돼요. 앨범과 사진은 참여한 뒤에도 각각의 공개 범위를 따라요.</span></span></label>{spaceError&&<p role="alert" className="text-xs text-[#a33b2f]">{spaceError}</p>}<button type="submit" disabled={spaceBusy||!spaceName.trim()} className="w-full rounded-xl bg-[#99452c] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{spaceBusy?'만드는 중…':'공간 만들기'}</button></form>}</section></div>}
  </div>;
}

export function StitchSubpage({title,crewName,crewMemberCount=1,screen,screenHref,createHref,children}:{title:string;crewName:string;crewMemberCount?:number;screen:'photos'|'behind'|'settings';screenHref:(next:'home'|'photos'|'behind'|'settings')=>string;createHref?:string;children:ReactNode}) {
  return <div className={`${stitchRoot} fixed inset-0 z-[60] flex flex-col bg-[#fff8f5] text-[#30251f] antialiased`} style={{fontFamily:sansStack}}>
    <StitchIconFont/>
    {screen==='behind'||screen==='settings'?<header className="z-20 w-full border-b border-[#efdfd5]/70 bg-[#fff8f5]/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl"><div className="mx-auto max-w-md px-4"><div className="flex h-[52px] items-center justify-between gap-2"><Link href={screenHref('home')} className="stitch-serif text-[15px] font-semibold tracking-tight text-[#99452c]">메모네스티아</Link><div className="flex min-w-0 items-center gap-1.5"><button type="button" className="flex max-w-[150px] items-center gap-1 rounded-full bg-[#f6e5db] px-2.5 py-1.5 text-[9px] font-semibold text-[#7d562d]"><span className="truncate">{crewName}</span><Icon name="expand_more" className="text-sm"/></button><button type="button" aria-label="알림" className="flex h-8 w-8 items-center justify-center rounded-full text-[#55433d]"><Icon name="notifications" className="text-[18px]"/></button><Link href={screenHref('settings')} aria-label="크루 설정" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#99452c] text-white"><Icon name="person" className="text-[16px]"/></Link></div></div></div></header>:screen==='photos'?<header className="z-20 w-full border-b border-[#efdfd5]/70 bg-[#fff8f5]/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-[780px] items-center justify-between px-5"><button type="button" className="flex min-w-0 items-center gap-1.5 rounded-full bg-[#f6e5db] px-3 py-1.5 text-left text-[#30251f] shadow-sm"><span className="truncate text-sm font-semibold">{crewName}</span><Icon name="expand_more" className="text-[18px] text-[#88726c]"/></button><div className="flex items-center gap-1.5"><button type="button" aria-label="알림" className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#78675e]"><Icon name="notifications" className="text-[22px]"/><span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#99452c] ring-2 ring-[#fff8f5]"/></button><Link href={screenHref('settings')} aria-label="크루 설정" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4dfd3] text-[#99452c]"><Icon name="person" className="text-[18px]"/></Link></div></div></header>:<header className="z-20 border-b border-[#efdfd5] bg-[#fff8f5]/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] backdrop-blur-xl"><div className="mx-auto flex max-w-md items-center justify-between md:max-w-6xl"><Link href={screenHref('home')} aria-label="홈 피드" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#55433d] shadow-sm"><Icon name="arrow_back" className="text-[20px]"/></Link><div className="min-w-0 text-center"><span className="block truncate text-[10px] text-[#88726c]">{crewName}</span><h1 className="stitch-serif truncate text-base font-semibold text-[#30251f]">{title}</h1></div><Link href={screenHref('settings')} aria-label="크루 설정" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fcebe0] text-[#99452c]"><Icon name="settings" className="text-[20px]"/></Link></div></header>}
    <main className={`mx-auto w-full max-w-[780px] flex-1 overflow-y-auto px-5 pb-24 pt-5 ${screen==='behind'||screen==='settings'?'':'md:px-8 md:pt-8'}`}>{children}</main>
    <nav className={`fixed bottom-0 left-1/2 z-30 grid h-[calc(64px+env(safe-area-inset-bottom))] w-full ${screen==='behind'||screen==='settings'?'max-w-md':'max-w-md md:max-w-2xl'} -translate-x-1/2 grid-cols-5 border-t border-[#efdfd5] bg-[#fff8f5]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:rounded-t-2xl md:border-x md:border-[#efdfd5]`} aria-label="주요 메뉴">
      {([{key:'home',icon:'cottage',text:'홈 피드'},{key:'photos',icon:'photo_library',text:'사진 서랍'}]).map(tab=><Link key={tab.key} href={screenHref(tab.key as 'home'|'photos'|'behind'|'settings')} aria-current={screen===tab.key?'page':undefined} className={`flex flex-col items-center justify-center gap-1 text-[10px] ${screen===tab.key?'font-bold text-[#99452c]':'text-[#78675e]'}`}><Icon name={tab.icon} className="text-[21px]"/><span>{tab.text}</span></Link>)}
      <Link href={createHref??'/?lang=ko&quick=1'} aria-label="새 앨범 만들기" className="-mt-4 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-[#99452c]"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#99452c] text-white shadow-[0_5px_14px_rgba(153,69,44,.3)]"><Icon name="add_circle" className="text-[23px]"/></span><span>앨범 생성</span></Link>
      {([{key:'behind',icon:'sticky_note_2',text:'비하인드'},{key:'settings',icon:'settings',text:'크루 설정'}]).map(tab=><Link key={tab.key} href={screenHref(tab.key as 'home'|'photos'|'behind'|'settings')} aria-current={screen===tab.key?'page':undefined} className={`flex flex-col items-center justify-center gap-1 text-[10px] ${screen===tab.key?'font-bold text-[#99452c]':'text-[#78675e]'}`}><Icon name={tab.icon} className="text-[21px]"/><span>{tab.text}</span></Link>)}
    </nav>
  </div>;
}

type DrawerRoom={id:string;groupId:string|null;name:string;category:string;count:number;image:string};
type DrawerPhoto={id:string;roomId:string;name:string;src:string;mediaType:string;created:number;mine?:boolean};
type DrawerNote={id:string;body:string;author:string;mine:boolean;createdAt:string};
export function StitchPhotoDrawer({groupId}:{groupId:string|null}) {
  const [rooms,setRooms]=useState<DrawerRoom[]>([]),[photos,setPhotos]=useState<DrawerPhoto[]>([]),[roomId,setRoomId]=useState<string|null>(null),[monthKey,setMonthKey]=useState<string|null>(null),[sort,setSort]=useState<'latest'|'oldest'>('latest'),[grid,setGrid]=useState(true),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
  const [openedAlbumId, setOpenedAlbumId] = useState<string | null>(null);
  const [albumTab, setAlbumTab] = useState<'album' | 'paper'>('album');
  const albumTrigger = useRef<HTMLButtonElement | null>(null);
  const drawerAnchor = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      setOpenedAlbumId(params.get('album'));
      setAlbumTab(params.get('view') === 'rolling' ? 'paper' : 'album');
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  function openDrawerAlbum(id: string, trigger: HTMLButtonElement) {
    albumTrigger.current = trigger;
    const url = new URL(window.location.href);
    url.searchParams.set('group', groupId ?? 'personal');
    url.searchParams.set('album', id);
    url.searchParams.delete('view');
    window.history.pushState({ ...window.history.state, drawerAlbum: true }, '', url);
    setOpenedAlbumId(id);
    setAlbumTab('album');
  }
  function closeDrawerAlbum() {
    if (window.history.state?.drawerAlbum) window.history.back();
    else {
      const url = new URL(window.location.href);
      url.searchParams.delete('album');
      url.searchParams.delete('view');
      window.history.replaceState(window.history.state, '', url);
      setOpenedAlbumId(null);
    }
  }
  const openedRoom = rooms.find(room => room.id === openedAlbumId);
  useEffect(() => {
    if (!openedRoom) { albumTrigger.current?.focus({ preventScroll: true }); return; }
    const shell = drawerAnchor.current?.closest<HTMLElement>('.stitch-root');
    if (shell) shell.inert = true;
    return () => { if (shell) shell.inert = false; };
  }, [openedRoom]);
  useEffect(()=>{let active=true;api<{rooms:DrawerRoom[];photos:DrawerPhoto[]}>('/api/workspace').then(result=>{if(active){const matching=result.rooms.filter(room=>(room.groupId||null)===groupId);const ids=new Set(matching.map(room=>room.id));setRooms(matching);setPhotos(result.photos.filter(photo=>ids.has(photo.roomId)));setFailed(false);}}).catch(()=>{if(active)setFailed(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[groupId]);
  const months=[...new Set(photos.map(photo=>{const date=new Date(photo.created);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}))].sort().reverse();
  const visible=photos.filter(photo=>(!roomId||photo.roomId===roomId)&&(!monthKey||`${new Date(photo.created).getFullYear()}-${String(new Date(photo.created).getMonth()+1).padStart(2,'0')}`===monthKey)).sort((a,b)=>sort==='latest'?b.created-a.created:a.created-b.created),activeRoom=rooms.find(room=>room.id===roomId),featuredMonth=months[0],featuredPhotos=featuredMonth?photos.filter(photo=>`${new Date(photo.created).getFullYear()}-${String(new Date(photo.created).getMonth()+1).padStart(2,'0')}`===featuredMonth).sort((a,b)=>b.created-a.created):[],featuredLabel=featuredMonth?new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long'}).format(new Date(`${featuredMonth}-01T00:00:00`)):'사진을 모아보세요';
  return <>
    <span ref={drawerAnchor} hidden/>
    {openedRoom && createPortal(<div className="fixed inset-0 z-[100] bg-[#efe8e2]">
      <FeedAlbumView key={openedRoom.id} album={{id:openedRoom.id,name:openedRoom.name,category:openedRoom.category,photoCount:openedRoom.count,cover:openedRoom.image||null,updatedAt:''}} onBack={closeDrawerAlbum} initialTab={albumTab} backLabel="사진 서랍으로 돌아가기"/>
    </div>, document.body)}
    <section className="mb-5 flex flex-col gap-3 pt-2"><div className="flex items-start justify-between gap-2"><div><span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[#e5efe3] px-2.5 py-1 text-[10px] font-semibold text-[#527452]"><Icon name="auto_stories" className="text-sm"/>공동 사진 보관함</span><h2 className="stitch-serif flex items-center gap-1.5 text-[1.65rem] font-semibold tracking-tight text-[#30251f] md:text-3xl">우리들의 사진 서랍 <span className="text-xl">🗄️</span></h2><p className="mt-1 text-xs leading-snug text-[#78675e] md:text-sm">차곡차곡 쌓인 우리 크루의 모든 순간과 숨겨진 사진 뒷면 이야기</p></div><div className="flex shrink-0 items-center gap-1 pt-1"><button type="button" onClick={()=>setSort(sort==='latest'?'oldest':'latest')} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#55433d] shadow-sm"><Icon name="history_edu" className="text-sm text-[#99452c]"/>{sort==='latest'?'최신순':'오래된순'}<Icon name="expand_more" className="text-sm"/></button><button type="button" aria-label="보기 방식 전환" onClick={()=>setGrid(v=>!v)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#78675e] shadow-sm"><Icon name={grid?'grid_view':'photo_library'} className="text-lg"/></button></div></div></section>
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="사진 서랍 필터"><button type="button" onClick={()=>{setRoomId(null);setMonthKey(null)}} aria-pressed={!roomId&&!monthKey} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold ${!roomId&&!monthKey?'bg-[#dc765a] text-white shadow-sm':'bg-white text-[#78675e]'}`}>전체 <span className="ml-0.5 opacity-80">{photos.length}</span></button>{months.slice(0,4).map(month=><button key={month} type="button" onClick={()=>{setRoomId(null);setMonthKey(month)}} aria-pressed={monthKey===month} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold ${monthKey===month?'bg-[#dc765a] text-white shadow-sm':'bg-white text-[#78675e]'}`}>{new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long'}).format(new Date(`${month}-01T00:00:00`))} <span className="ml-0.5 opacity-70">{photos.filter(p=>`${new Date(p.created).getFullYear()}-${String(new Date(p.created).getMonth()+1).padStart(2,'0')}`===month).length}</span></button>)}{rooms.slice(0,3).map(room=><button key={room.id} type="button" onClick={()=>{setRoomId(room.id);setMonthKey(null)}} aria-pressed={roomId===room.id} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold ${roomId===room.id?'bg-[#dc765a] text-white shadow-sm':'bg-white text-[#78675e]'}`}>{room.name}</button>)}</div>
    <section className="mb-7 px-0.5"><div className="relative overflow-hidden rounded-xl bg-white p-4 shadow-[0_4px_18px_-2px_rgba(112,100,92,0.08)] md:p-6"><span className="absolute -top-2 left-1/2 h-5 w-24 -translate-x-1/2 rotate-1 bg-[#f4d19b]/60 shadow-sm"/><div className="flex items-start justify-between gap-3 pt-1"><div><span className="text-[10px] font-bold uppercase tracking-wide text-[#99452c]">앨범 사진 모아보기</span><h3 className="stitch-serif mt-1 text-lg font-semibold text-[#30251f] md:text-xl">{featuredLabel}</h3><p className="mt-1 text-[11px] text-[#78675e]">{featuredPhotos.length}장 저장됨</p></div><div className="grid h-16 w-16 shrink-0 grid-cols-3 gap-0.5 overflow-hidden rounded-lg bg-[#f3e5dc] p-1 shadow-inner md:h-20 md:w-20">{featuredPhotos.slice(0,9).map(photo=><img key={photo.id} src={photo.src} alt="" className="h-full w-full rounded-[2px] object-cover"/>)}</div></div><div className="mt-4 flex gap-2 rounded-lg bg-[#f8f2ee] p-2"><button type="button" onClick={()=>document.getElementById('polaroidGrid')?.scrollIntoView({behavior:'smooth',block:'center'})} className="flex-1 rounded-lg bg-[#dc765a] px-3 py-2 text-[10px] font-semibold text-white">사진 전체 보기</button><button type="button" disabled={!featuredMonth} onClick={()=>{setRoomId(null);setMonthKey(featuredMonth)}} className="flex items-center justify-center gap-1 rounded-lg bg-white px-3 py-2 text-[10px] font-semibold text-[#78675e] disabled:opacity-50"><Icon name="photo_library" className="text-sm text-[#bd624a]"/>{featuredMonth?'해당 월 사진 보기':'월별 기록 없음'}</button></div></div></section>
    <section className="mb-7"><div className="mb-3 flex items-center justify-between"><h3 className="stitch-serif flex items-center gap-1.5 text-lg font-semibold text-[#30251f]"><Icon name="photo_library" className="text-xl text-[#99452c]"/>특별한 날 모아보기</h3><span className="text-[10px] text-[#78675e]">{rooms.length}개 앨범</span></div><div className="flex gap-3.5 overflow-x-auto pb-2 no-scrollbar">{rooms.map(room=><article key={room.id} className={`relative w-64 shrink-0 rounded-xl bg-white p-3 shadow-[0_4px_14px_-2px_rgba(112,100,92,0.08)] ${roomId===room.id?'ring-2 ring-[#e27d60]':''}`}><span className="absolute -top-1.5 right-4 z-10 h-4 w-12 rotate-3 bg-[#e8d5a9]/70"/><button type="button" onClick={()=>{setRoomId(roomId===room.id?null:room.id);setMonthKey(null)}} aria-pressed={roomId===room.id} className="block w-full text-left"><div className="relative mb-2.5 h-36 overflow-hidden rounded-lg bg-[#f3e5dc]">{room.image&&<img src={room.image} alt="" className="h-full w-full object-cover"/>}<div className="absolute inset-0 bg-gradient-to-t from-[#30251f99] to-transparent"/><span className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-semibold text-white"><Icon name="photo_camera" className="text-sm"/>{room.count}장 · 함께 모은 추억</span></div><b className="block truncate text-[13px] text-[#30251f]">{room.name}</b><span className="mt-0.5 block truncate text-[11px] text-[#78675e]">{room.category} · 사진과 뒷면 낙서를 모아봐요</span></button><button type="button" onClick={event=>openDrawerAlbum(room.id,event.currentTarget)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-[#fff1e9] px-3 py-2 text-[10px] font-semibold text-[#99452c]"><Icon name="auto_stories" className="text-sm"/>앨범책 펼쳐보기<Icon name="chevron_right" className="text-sm"/></button></article>)}</div></section>
    <section className="mb-7"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="stitch-serif flex items-center gap-1.5 text-lg font-semibold text-[#30251f]"><Icon name="photo_library" className="text-xl text-[#7a8f6b]"/>사진 조각들</h3><span className="flex items-center gap-1 rounded-full bg-[#f2ece6] px-2.5 py-1 text-[10px] text-[#78675e]"><Icon name="sync" className="text-sm text-[#99452c]"/>사진을 누르면 뒷면 낙서로 휙!</span></div>
      {failed?<div className="rounded-xl bg-white p-5 text-center text-sm text-[#78675e]">사진 서랍을 불러오지 못했어요. 잠시 후 다시 열어주세요.</div>:loading?<MemoryLoading compact/>:!visible.length?<div className="rounded-xl border border-[#efdfd5] bg-white p-8 text-center"><span className="text-3xl">🧺</span><p className="stitch-serif mt-2 text-lg font-semibold">아직 모인 사진이 없어요</p><p className="mt-1 text-sm text-[#78675e]">크루 앨범에 사진을 담으면 여기에 펼쳐져요.</p></div>:<div id="polaroidGrid" className={`grid ${grid?'grid-cols-2':'grid-cols-1'} gap-3 pt-1 md:gap-4`}>{visible.map((photo,index)=><DrawerPhotoCard key={photo.id} photo={photo} index={index} roomName={rooms.find(room=>room.id===photo.roomId)?.name??''}/>)}</div>}
    </section>
    <footer className="rounded-xl bg-[#f2eee8] p-4 text-center shadow-sm"><div className="flex items-center justify-center gap-1.5 text-[10px] text-[#78675e]"><Icon name="verified" className="text-base text-[#7a8f6b]"/>모든 사진과 원본은 크루원에게만 안전하게 보관됩니다.</div><p className="mt-1 text-[9px] text-[#9a8981]">공유 범위는 사진마다 설정한 크루 공개 기준을 따릅니다.</p></footer>
  </>;
}

function DrawerPhotoCard({photo,index,roomName}:{photo:DrawerPhoto;index:number;roomName:string}) {
  const [flipped,setFlipped]=useState(false),[notes,setNotes]=useState<DrawerNote[]>([]),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{if(!flipped)return;let active=true;api<{comments:DrawerNote[]}>('/api/discussion?kind=photo&id='+encodeURIComponent(photo.id)).then(result=>{if(active)setNotes(result.comments)}).catch(()=>{});return()=>{active=false};},[flipped,photo.id]);
  async function submit(event:FormEvent){event.preventDefault();if(!draft.trim()||busy)return;setBusy(true);setError('');try{await api('/api/discussion',{method:'POST',body:JSON.stringify({kind:'photo',targetId:photo.id,action:'comment',id:crypto.randomUUID(),body:draft.trim()})});const result=await api<{comments:DrawerNote[]}>('/api/discussion?kind=photo&id='+encodeURIComponent(photo.id));setNotes(result.comments);setDraft('')}catch{setError('낙서를 남기지 못했어요. 다시 시도해 주세요.')}finally{setBusy(false)}}
  const date=new Date(photo.created),tape=['bg-[#e8d5a9]/70','bg-[#d5e6ce]/75','bg-[#f4d19b]/60','bg-[#d9e8e8]/75'][index%4];
  return <article className={`relative rounded-xl bg-white p-2 pb-3.5 shadow-[0_4px_16px_-2px_rgba(112,100,92,0.08)] transition-transform hover:rotate-0 ${index%4===0?'-rotate-[.8deg]':index%4===1?'rotate-[1deg]':index%4===2?'rotate-[.6deg]':'-rotate-[1deg]'}`}><span className={`absolute -top-2 left-1/2 z-10 h-3.5 w-12 -translate-x-1/2 rotate-2 rounded-sm ${tape}`}/><div className="relative block w-full overflow-hidden rounded-lg bg-[#f3e5dc] text-left"><button type="button" onClick={()=>setFlipped(true)} aria-label="사진 뒷면 낙서 보기" aria-hidden={flipped} tabIndex={flipped?-1:0} disabled={flipped} className="block w-full"><div className="aspect-[4/5]">{photo.mediaType==='video'?<video src={photo.src} muted playsInline preload="metadata" className="h-full w-full object-cover"/>:<img src={photo.src} alt={photo.name||roomName||'크루 사진'} className="h-full w-full object-cover"/>}</div></button>{flipped?<div className="absolute inset-0 flex flex-col bg-[#fff5d7]/95 p-3 text-[#4a3a2c]"><div className="flex items-center justify-between"><b className="stitch-serif text-sm">사진 뒷면 낙서</b></div><div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto">{notes.length?notes.slice(-4).map(note=><p key={note.id} className="rounded-lg bg-white/75 p-2 text-[10px] leading-4"><b>{note.mine?'나':note.author}</b> · {note.body}</p>):<p className="mt-4 text-center text-[10px] leading-5 text-[#78675e]">아직 뒷면 낙서가 없어요.<br/>첫 한마디를 남겨보세요 ✨</p>}</div><form onSubmit={submit} className="mt-2 flex gap-1"><input value={draft} onChange={e=>setDraft(e.target.value)} aria-label="사진 뒷면 낙서" placeholder="한마디 남기기" className="min-w-0 flex-1 rounded-lg border border-[#eadcc1] bg-white px-2 py-1.5 text-[10px] outline-none"/><button type="submit" disabled={busy||!draft.trim()} className="rounded-lg bg-[#99452c] px-2 text-[10px] font-bold text-white disabled:opacity-50">등록</button></form>{error&&<p role="alert" className="mt-1 text-[9px] text-red-700">{error}</p>}</div>:<><span className="pointer-events-none absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#30251f99] text-white backdrop-blur"><Icon name="flip" className="text-[13px]"/></span>{photo.mediaType==='video'&&<span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-[#30251fcc] px-2 py-1 text-[9px] text-white">VIDEO</span>}</>}</div><div className="space-y-1.5 px-0.5 pt-2"><div className="flex items-center justify-between gap-2 text-[10px] text-[#78675e]"><span className="truncate">{new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit'}).format(date)} {photo.name||roomName}</span><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${photo.mine?'bg-[#f2d5c8] text-[#99452c]':'bg-[#dcebd9] text-[#527452]'}`}>{photo.mine?'나':'크'}</span></div><button type="button" onClick={()=>setFlipped(v=>!v)} className="flex w-full items-center justify-between rounded-full bg-[#e8f0e4] px-2 py-1 text-[9px] font-medium text-[#527452]"><span className="flex items-center gap-1"><Icon name="chat_bubble_outline" className="text-[13px]"/>{flipped?'사진 앞면 보기':'뒷면 낙서 보기'}</span></button></div></article>;
}

type BehindRecord={id:string;kind:string;title:string;body:string;day:string;created:number;photos:{id:string;src:string;mediaType:string;body:string}[]};
type BehindRoom={id:string;groupId:string|null;name:string};
export function StitchBehind({groupId}:{groupId:string|null}) {
  const [records,setRecords]=useState<(BehindRecord&{album:string;folderId:string})[]>([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[notes,setNotes]=useState<Record<string,{id:string;body:string;author:string;mine:boolean;createdAt?:string}[]>>({}),[filter,setFilter]=useState<'all'|'new'|'mine'>('all');
  useEffect(()=>{let alive=true;async function load(){try{const workspace=await api<{rooms:BehindRoom[]}>('/api/workspace');const rooms=workspace.rooms.filter(room=>(room.groupId||null)===groupId);const batches=await Promise.all(rooms.map(async room=>{const result=await api<{items:BehindRecord[]}>('/api/memories?folderId='+encodeURIComponent(room.id)+'&timezone='+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone));return result.items.filter(item=>item.kind==='record').map(item=>({...item,album:room.name,folderId:room.id}));}));if(alive)setRecords(batches.flat().sort((a,b)=>b.created-a.created));}catch{if(alive)setFailed(true);}finally{if(alive)setLoading(false);}}void load();return()=>{alive=false;};},[groupId]);
  useEffect(()=>{let alive=true;Promise.all(records.filter(record=>!notes[record.id]).map(async record=>{try{const result=await api<{comments:{id:string;body:string;author:string;mine:boolean;createdAt?:string}[]}>(`/api/discussion?kind=record&id=${encodeURIComponent(record.id)}`);if(alive)setNotes(old=>({...old,[record.id]:result.comments}));}catch{}}));return()=>{alive=false;};},[records,notes]);
  const filtered=records.filter(record=>{const recordNotes=notes[record.id]??[];if(filter==='new')return recordNotes.some(note=>Date.now()-new Date(note.createdAt??record.created).getTime()<86400000);if(filter==='mine')return recordNotes.some(note=>note.mine);return true;});
  return <div className="space-y-5">
    <section className="space-y-1 pt-1"><div className="flex items-center gap-1.5"><h1 className="stitch-serif text-[1.625rem] leading-[2.125rem] font-medium tracking-tight text-[#99452c]">비하인드 낙서장</h1><Icon name="draw" className="text-xl text-[#99452c]"/></div><p className="text-[11px] leading-4 text-[#55433d]">앨범 기록에 멤버들이 남긴 댓글과 사진 뒷면 메모</p></section>
    <div className="-mx-1 flex gap-2 overflow-x-auto py-0.5 no-scrollbar" role="group" aria-label="비하인드 필터">{([{id:'all',name:'전체 기록'},{id:'new',name:'최근 24시간'},{id:'mine',name:'내 댓글이 있는 기록'}] as const).map(item=><button key={item.id} type="button" aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-medium transition-colors ${filter===item.id?'bg-[#99452c] text-white shadow-[0_2px_8px_rgba(153,69,44,.25)]':'bg-[#f6e5db] text-[#30251f] hover:bg-[#f0dfd5]'}`}><span>{item.name}</span></button>)}</div>
    <section className="space-y-3.5"><div className="flex items-center justify-between"><h2 className="stitch-serif flex items-center gap-2 text-[1.125rem] font-medium text-[#30251f]"><span className="h-2 w-2 rounded-full bg-[#99452c]"/>사진 뒷면 기록</h2></div>
      {loading?<MemoryLoading compact/>:failed?<div className="rounded-xl bg-white p-8 text-center text-xs text-[#78675e]">비하인드 사진을 불러오지 못했어요.</div>:filtered.length?filtered.map((record,index)=><BehindFeedCard key={record.id} record={record} groupId={groupId} notes={notes[record.id]??[]} index={index} onNotes={next=>setNotes(old=>({...old,[record.id]:next}))}/>):<div className="rounded-xl bg-white p-8 text-center text-xs text-[#78675e]">아직 사진 뒷면에 낙서가 없어요. 첫 한마디를 남겨보세요.</div>}
    </section>
  </div>;
}

function BehindFeedCard({record,notes,index,onNotes,groupId}:{groupId:string|null;record:BehindRecord&{album:string;folderId:string};notes:{id:string;body:string;author:string;mine:boolean;createdAt?:string}[];index:number;onNotes:(notes:{id:string;body:string;author:string;mine:boolean;createdAt?:string}[])=>void}) {
  const [draft,setDraft]=useState(''),[posting,setPosting]=useState(false),[error,setError]=useState(''),[likes,setLikes]=useState(0),[liked,setLiked]=useState(false),[liking,setLiking]=useState(false);
  useEffect(()=>{let alive=true;api<{count:number;liked:boolean}>(`/api/discussion?kind=record&id=${encodeURIComponent(record.id)}`).then(result=>{if(alive){setLikes(result.count);setLiked(result.liked)}}).catch(()=>{});return()=>{alive=false}},[record.id]);
  async function addNote(body:string){if(!body.trim()||posting)return;setPosting(true);setError('');try{await api('/api/discussion',{method:'POST',body:JSON.stringify({kind:'record',targetId:record.id,action:'comment',id:crypto.randomUUID(),body:body.trim()})});const result=await api<{comments:{id:string;body:string;author:string;mine:boolean;createdAt?:string}[]}>(`/api/discussion?kind=record&id=${encodeURIComponent(record.id)}`);onNotes(result.comments);setDraft('');}catch{setError('낙서를 남기지 못했어요. 다시 시도해 주세요.')}finally{setPosting(false)}}
  async function toggleLike(){if(liking)return;const next=!liked;setLiking(true);setError('');try{await api('/api/discussion',{method:'POST',body:JSON.stringify({kind:'record',targetId:record.id,action:'like',liked:next})});setLiked(next);setLikes(count=>Math.max(0,count+(next?1:-1)))}catch{setError('공감을 저장하지 못했어요. 다시 시도해 주세요.')}finally{setLiking(false)}}
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();await addNote(draft)}
  const photo=record.photos[0],date=new Date(record.created),tones=['bg-[#c2e9c9] text-[#486a51]','bg-[#ffdbd1] text-[#7b2e17]','bg-[#ffdcbd] text-[#623f18]'];
  return <article className="relative overflow-hidden rounded-xl bg-[#fff1e9] shadow-[0_4px_16px_-2px_rgba(112,100,92,.08),0_1px_3px_rgba(112,100,92,.04)]"><span className={`absolute -top-2 z-10 h-5 w-24 ${index%2?'right-5 rotate-3 bg-[#ffdbd1]/70':'left-1/2 -translate-x-1/2 -rotate-1 bg-[#f0bd8b]/40'} pointer-events-none rounded-sm shadow-sm`}/><div className="flex flex-col gap-4 p-4 pt-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className={`relative h-14 w-14 shrink-0 rotate-[-2deg] rounded-lg bg-white p-1 shadow-[0_2px_8px_rgba(112,100,92,.12)] ${index%2?'rotate-2':''}`}>{photo?<img src={photo.src} alt={record.title||record.album} className="h-full w-full rounded object-cover"/>:<div className="flex h-full items-center justify-center text-2xl">📷</div>}<span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f0dfd5] text-[#55433d] shadow"><Icon name="flip" className="text-xs"/></span></div><div className="min-w-0"><span className="text-[10px] font-medium text-[#7d562d]">{date.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'})} 기록의 뒷면</span><h3 className="stitch-serif mt-0.5 line-clamp-2 text-sm font-medium leading-5 text-[#30251f] md:text-base">{record.title||record.album}</h3><span className="mt-0.5 block truncate text-[10px] text-[#78675e]">{record.album}</span></div></div><Link href={joinedAlbumHref('ko',record.folderId,groupId??undefined)} className="flex shrink-0 items-center gap-1 rounded-lg bg-[#f6e5db]/80 px-2 py-1.5 text-[10px] text-[#55433d] hover:text-[#99452c]"><Icon name="visibility" className="text-sm"/>앞면</Link></div>
    <div className="space-y-3 rounded-lg bg-white p-3.5 shadow-inner">{notes.length?notes.slice(-3).map((note,n)=><div key={note.id}>{n>0&&<div className="mb-3 h-px w-full bg-[#fcebe0]"/>}<div className="flex items-start gap-2"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${tones[n%tones.length]}`}>{note.mine?'나':(note.author||'?').slice(0,1)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><b className="text-[10px] font-bold text-[#30251f]">{note.mine?'나':note.author}</b><time className="text-[9px] text-[#88726c]">{note.createdAt?formatTimestamp(note.createdAt):''}</time></div><p className="mt-0.5 text-xs leading-[1.45] text-[#30251f]">{note.body}</p></div></div></div>):<p className="py-2 text-center text-xs text-[#78675e]">아직 댓글이 없어요. 첫 한마디를 남겨보세요.</p>}</div>
    <div className="flex items-center justify-between border-t border-[#efdfd5] pt-1"><div className="flex items-center gap-1.5"><button type="button" aria-pressed={liked} disabled={liking} onClick={()=>void toggleLike()} className={`rounded-full px-3 py-1.5 text-[10px] transition-colors disabled:opacity-60 ${liked?'bg-[#99452c] text-white':'bg-[#f6e5db] text-[#55433d]'}`}><Icon name="favorite" className={`mr-1 inline text-sm ${liked?'text-white':'text-[#99452c]'}`}/>공감 {likes}</button><span className="rounded-full bg-[#f6e5db] px-3 py-1.5 text-[10px] text-[#55433d]"><Icon name="sticky_note_2" className="mr-1 inline text-sm text-[#43664d]"/>낙서</span></div><button type="button" onClick={()=>document.getElementById(`behind-draft-${record.id}`)?.focus()} className="flex items-center gap-1 rounded-xl bg-[#99452c] px-3.5 py-1.5 text-[10px] font-medium text-white shadow-[0_2px_8px_rgba(153,69,44,.22)]"><Icon name="edit_note" className="text-base"/>한 줄 남기기</button></div>
    <form onSubmit={submit} className="flex gap-2"><input id={`behind-draft-${record.id}`} value={draft} onChange={event=>setDraft(event.target.value)} maxLength={300} placeholder="사진 뒷면에 한마디 남기기…" className="min-w-0 flex-1 rounded-lg border border-[#efdfd5] bg-white/80 px-3 py-2.5 text-xs outline-none focus:border-[#e27d60]"/><button disabled={!draft.trim()||posting} className="flex items-center gap-1 rounded-lg bg-[#c2e9c9] px-3 text-xs font-semibold text-[#486a51] disabled:opacity-50"><Icon name="send" className="text-sm"/>{posting?'…':'등록'}</button></form>{error&&<p role="alert" className="text-[10px] text-[#a13d32]">{error}</p>}</div></article>;
}

function FullBundleView({ item, initialMode, onBack, actions }: { item: FeedItem; initialMode: 'gallery' | 'slideshow'; onBack: () => void; actions: FeedActions }) {
  const [mode, setMode] = useState(initialMode);
  const [active, setActive] = useState(0);
  const [day, setDay] = useState<string | null>(null);
  const [backside, setBackside] = useState(false);
  const [notes, setNotes] = useState(item.comments);
  const days = [...new Set(item.photos.map(photo => photo.day).filter((value): value is string => Boolean(value)))];
  const photos = day ? item.photos.filter(photo => photo.day === day) : item.photos;
  const photo = photos[active] ?? photos[0];
  useEffect(() => {
    let alive = true;
    api<{comments:{id:string;body:string;author:string;mine:boolean;createdAt:string}[]}>(`/api/discussion?kind=record&id=${encodeURIComponent(item.id)}`)
      .then(result => { if (alive) setNotes(result.comments.map(note => ({id:note.id,body:note.body,author:{id:note.id,name:note.author,mine:note.mine},createdAt:note.createdAt}))); })
      .catch(() => {});
    return () => { alive = false; };
  }, [item.id]);
  function openSlide(index: number) { setActive(index); setMode('slideshow'); setBackside(false); }
  function changeDay(value: string | null) { setDay(value); setActive(0); setBackside(false); }
  return <div className={`${stitchRoot} fixed inset-0 z-[70] overflow-y-auto bg-[#fff8f5] text-[#30251f] antialiased`} style={{fontFamily:sansStack}}>
    <StitchIconFont/>
    <header className="sticky top-0 z-20 border-b border-[#efdfd5] bg-[#fff8f5]/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <button type="button" onClick={onBack} aria-label="피드로 돌아가기" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#55433d] shadow-sm"><Icon name="arrow_back" className="text-[20px]"/></button>
        <span className="stitch-serif text-base font-semibold text-[#99452c]">메모네스티아</span>
        <span className="w-10 text-right text-xs font-semibold text-[#88726c]">{mode === 'gallery' ? '사진함' : '슬라이드'}</span>
      </div>
    </header>
    <main className="mx-auto flex min-h-[calc(100dvh-64px)] w-full max-w-md flex-col px-5 pb-12 pt-5">
      <div className="mb-4 rounded-2xl border border-[#efdfd5] bg-white p-4 shadow-[0_5px_18px_rgba(98,69,43,.07)]">
        <div className="mb-2 flex items-center justify-between"><span className={`${label} font-bold uppercase text-[#bd624a]`}>✈ 여행 · 이벤트 묶음</span><span className="text-xs font-semibold text-[#78675e]">{item.photoCount}장의 조각</span></div>
        <h1 className="stitch-serif text-[1.45rem] font-semibold leading-tight tracking-tight">{item.title || '우리의 여행 기록'}</h1>
        {item.body && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#78675e]">{item.body}</p>}
        {days.length > 0 && <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="여행 날짜">
          <button type="button" onClick={() => changeDay(null)} aria-pressed={!day} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${!day ? 'bg-[#99452c] text-white' : 'bg-[#fcebe0] text-[#55433d]'}`}>전체 {item.photoCount}</button>
          {days.map((value,index)=><button key={value} type="button" onClick={() => changeDay(day === value ? null : value)} aria-pressed={day===value} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${day===value ? 'bg-[#99452c] text-white' : 'bg-[#fcebe0] text-[#55433d]'}`}>{index+1}일차 <span className="opacity-75">{value.slice(5).replace('-', '.')}</span></button>)}
        </div>}
      </div>
      <div className="mb-4 flex rounded-xl bg-[#f3e5dc] p-1" role="tablist" aria-label="사진 보기 방식">
        <button type="button" role="tab" aria-selected={mode==='gallery'} onClick={() => setMode('gallery')} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${mode==='gallery'?'bg-white text-[#99452c] shadow-sm':'text-[#78675e]'}`}>▦ 전체 사진 {item.photoCount}</button>
        <button type="button" role="tab" aria-selected={mode==='slideshow'} onClick={() => {setMode('slideshow');setBackside(false);}} className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${mode==='slideshow'?'bg-white text-[#99452c] shadow-sm':'text-[#78675e]'}`}>◉ 슬라이드 & 뒷면</button>
      </div>
      {mode === 'gallery' ? <>
        <div className="mb-3 flex items-center justify-between"><h2 className="stitch-serif text-lg font-semibold">여행의 모든 순간</h2><span className="text-xs text-[#78675e]">{photos.length} / {item.photoCount}장</span></div>
        <div className="grid grid-cols-2 gap-3">
          {photos.map((entry,index)=><button key={entry.id} type="button" onClick={() => openSlide(index)} className="group relative aspect-[.82] overflow-hidden rounded-xl border-4 border-white bg-[#f3e5dc] text-left shadow-[0_4px_12px_rgba(98,69,43,.1)]">
            {entry.video ? <video src={entry.src} muted playsInline preload="metadata" className="h-full w-full object-cover"/> : <img src={entry.src} alt={`${index+1}번째 여행 사진`} className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"/>}
            <span className="absolute bottom-2 left-2 rounded-full bg-[#fff8f5e8] px-2 py-1 text-[10px] font-semibold text-[#55433d]">{entry.day ? `${entry.day.slice(5).replace('-', '.')} · ` : ''}{index+1} / {photos.length}</span>
          </button>)}
        </div>
      </> : <>
        <div className="mb-2 flex items-center justify-between px-1"><h2 className="stitch-serif text-lg font-semibold">한 장씩 천천히</h2><span className="text-xs font-semibold text-[#78675e]">{active+1} / {photos.length}</span></div>
        <div className="relative overflow-hidden rounded-2xl border-[6px] border-white bg-white shadow-[0_10px_30px_rgba(98,69,43,.13)]">
          {backside ? <div className="flex min-h-[390px] flex-col bg-[#fff5cf] p-6 text-[#492a04]">
            <div className="mb-5 text-center"><span className="text-3xl">✉️</span><h3 className="stitch-serif mt-2 text-xl font-semibold">사진 뒷면 롤링페이퍼</h3><p className="mt-1 text-xs text-[#7d562d]">{item.commentCount}개의 추억 메모</p></div>
            {item.body && <p className="whitespace-pre-line border-y border-[#e9d77c] py-4 text-sm leading-relaxed">{item.body}</p>}
            <div className="mt-3 space-y-3">{notes.map(note=><p key={note.id} className="rounded-lg bg-white/70 p-3 text-sm leading-relaxed"><b>{note.author.mine?'나':note.author.name}</b><br/>{note.body}</p>)}{!notes.length&&!item.body&&<p className="py-6 text-center text-sm text-[#7d562d]">아직 남겨진 메모가 없어요.</p>}</div>
          </div> : photo?.video ? <video src={photo.src} controls playsInline className="aspect-[.82] w-full bg-black object-contain"/> : photo ? <img src={photo.src} alt={item.title || '여행 사진'} className="aspect-[.82] w-full bg-[#f3e5dc] object-cover"/> : <div className="flex aspect-[.82] items-center justify-center text-sm text-[#78675e]">사진이 없어요.</div>}
          <button type="button" onClick={() => setBackside(v=>!v)} className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-[#99452c] shadow-sm"><Icon name="flip" className="text-base"/>{backside?'사진 앞면':'뒷면 메모'}</button>
          {!backside && photo?.day && <span className="absolute bottom-3 left-3 rounded-full bg-[#fff8f5ed] px-3 py-1.5 text-xs font-semibold text-[#55433d]">{photo.day}</span>}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={() => {setActive(i=>Math.max(i-1,0));setBackside(false);}} disabled={active===0} className="rounded-full border border-[#efdfd5] bg-white px-4 py-2.5 text-sm font-semibold text-[#55433d] disabled:opacity-40">← 이전</button><button type="button" onClick={() => setBackside(v=>!v)} className="rounded-full bg-[#fcebe0] px-4 py-2.5 text-sm font-semibold text-[#99452c]">{backside?'앞면 보기':'뒷면 보기'}</button><button type="button" onClick={() => {setActive(i=>Math.min(i+1,photos.length-1));setBackside(false);}} disabled={active>=photos.length-1} className="rounded-full border border-[#efdfd5] bg-white px-4 py-2.5 text-sm font-semibold text-[#55433d] disabled:opacity-40">다음 →</button></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{photos.map((entry,index)=><button key={entry.id} type="button" onClick={() => {setActive(index);setBackside(false);}} aria-label={`${index+1}번째 사진`} aria-current={active===index?'true':undefined} className={`h-16 w-14 shrink-0 overflow-hidden rounded-lg border-[3px] ${active===index?'border-[#e27d60]':'border-white opacity-70'}`}><img src={entry.src} alt="" className="h-full w-full object-cover"/></button>)}</div>
      </>}
    </main>
  </div>;
}

function FeedCard({ item, index, owner, actions, groupId }: { groupId: string | null; item: FeedItem; index: number; owner: string | null; actions: FeedActions }) {
  const [backside, setBackside] = useState(false); const [activePhoto, setActivePhoto] = useState(0);

  const cover = item.photos[0];
  const days = [...new Set(item.photos.map(photo => photo.day).filter((day): day is string => Boolean(day)))];
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false); const [editing, setEditing] = useState(false); const [deleteConfirm, setDeleteConfirm] = useState(false); const [actionError, setActionError] = useState(''); const [actionBusy, setActionBusy] = useState(false);
  const visiblePhotos = selectedDay ? item.photos.filter(photo => photo.day === selectedDay) : item.photos;
  const activeMedia = visiblePhotos[activePhoto] ?? visiblePhotos[0] ?? cover;
  return <article className="relative flex flex-col bg-[#ffffff] rounded-2xl shadow-[0_4px_20px_-2px_rgba(112,100,92,0.08)] p-3.5 transition-transform hover:-translate-y-0.5">
    {index % 2 === 0
      ? <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#ffdcbd]/70 backdrop-blur-xs -rotate-2 z-10 pointer-events-none"/>
      : <div className="absolute -top-2 -right-2 w-16 h-5 bg-[#c2e9c9]/80 backdrop-blur-xs rotate-12 z-10 pointer-events-none"/>}
    <div className="flex items-center justify-between pb-3 pt-1">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center stitch-sans text-[0.875rem] leading-[1.25rem] tracking-[0.01em] font-[600] shadow-inner shrink-0 ${tone(item.author)}`}>{initial(item.author)}</div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5"><span className="stitch-sans text-[0.875rem] leading-[1.25rem] tracking-[0.01em] text-[#221a14] font-bold truncate">{item.author.mine ? '나' : item.author.name}</span>{item.author.id === owner && <span className="text-[11px] text-[#7d562d] bg-[#ffdcbd]/50 px-1.5 rounded font-medium shrink-0">크루장</span>}</div>
          <span className="stitch-sans text-[0.8125rem] leading-[1.25rem] font-[400] text-[#55433d] truncate">{formatTimestamp(item.createdAt)} · {item.album}</span>
        </div>
      </div>
      <div className="relative shrink-0"><button type="button" aria-label="게시물 메뉴" aria-expanded={menuOpen} onClick={()=>setMenuOpen(open=>!open)} className="flex h-8 w-8 items-center justify-center rounded-full text-[#55433d] transition-colors hover:bg-[#fcebe0]"><Icon name="more_horiz" className="text-[20px]"/></button>{menuOpen&&<div className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-[#efdfd5] bg-white p-1.5 shadow-xl">{item.author.mine?<>{item.kind==='record'&&<button type="button" onClick={()=>{setActionError('');setEditing(true);setMenuOpen(false);}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#30251f] hover:bg-[#fff5ef]"><Icon name="edit_note" className="text-lg text-[#99452c]"/>수정</button>}<button type="button" onClick={()=>{setActionError('');setDeleteConfirm(true);setMenuOpen(false);}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#a33224] hover:bg-[#fff1ee]"><Trash2 size={16} strokeWidth={1.8} aria-hidden="true"/>삭제</button></>:<p className="m-0 px-3 py-2 text-xs leading-relaxed text-[#78675e]">내가 작성한 게시물만 수정하거나 삭제할 수 있어요.</p>}</div>}</div>
    </div>
    {editing&&item.kind==='record'&&<QuickAlbum locale="ko" onClose={()=>setEditing(false)} onSaved={()=>{setEditing(false);actions.onRefresh?.();}} editItem={{id:item.id,folderId:item.folderId,title:item.title,body:item.body,day:item.day,shared:item.shared,recipients:item.recipients,revision:item.revision,photos:item.photos}}/>}
    {deleteConfirm&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#30251f]/45 p-5 backdrop-blur-[2px]" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!actionBusy)setDeleteConfirm(false);}}><section role="alertdialog" aria-modal="true" aria-labelledby={`delete-feed-${item.id}`} aria-describedby={`delete-desc-${item.id}`} className="w-full max-w-sm rounded-[26px] border border-[#efdfd5] bg-[#fffaf7] p-6 shadow-2xl"><span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#f9e9df] text-[#a94835]"><Trash2 size={21} strokeWidth={1.8} aria-hidden="true"/></span><h2 id={`delete-feed-${item.id}`} className="stitch-serif text-xl font-semibold text-[#30251f]">이 기록을 숨길까요?</h2><p id={`delete-desc-${item.id}`} className="mt-2 text-sm leading-relaxed text-[#78675e]">{item.kind==='record'?'피드와 앨범에서 기록과 연결 사진이 숨겨집니다. 저장된 파일은 지워지지 않아요.':'피드와 앨범에서 사진이 숨겨집니다. 저장된 파일은 지워지지 않아요.'}</p>{actionError&&<p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" disabled={actionBusy} onClick={()=>setDeleteConfirm(false)} className="rounded-full border border-[#e8d8ce] bg-white px-4 py-2.5 text-sm font-semibold text-[#55433d]">취소</button><button type="button" disabled={actionBusy} onClick={async()=>{setActionBusy(true);setActionError('');const problem=await actions.onDelete(item);setActionBusy(false);if(problem)setActionError(problem);else setDeleteConfirm(false);}} className="rounded-full bg-[#99452c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{actionBusy?'숨기는 중…':'숨기기'}</button></div></section></div>}
    {actionError&&!editing&&<p role="alert" className="mb-2 text-xs text-red-700">{actionError}</p>}
    {item.kind === 'record' && item.photoCount > 4 && <div className="rounded-xl bg-[#fff8f5] px-1 pt-1 pb-3">
      <div className="flex items-center justify-between gap-2 mb-1"><span className={`${label} text-[#7d562d] font-semibold`}>✈️ 여행 · 이벤트 묶음</span><span className={`${label} text-[#88726c]`}>{item.photoCount}장의 조각</span></div>
      <h2 className="stitch-serif text-[1.25rem] leading-snug font-semibold text-[#221a14]">{item.title || '우리의 여행 기록'}</h2>
      {item.body && <p className="stitch-sans text-[0.8125rem] leading-relaxed text-[#55433d] mt-1.5 whitespace-pre-line">{item.body}</p>}
    </div>}
    {cover && <div className={`relative w-full rounded-xl overflow-hidden bg-[#fff1e9] ${backside ? '' : item.kind === 'record' && item.photoCount > 4 ? 'aspect-[1.4]' : index % 2 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}>
      {!backside ? <div key="front" className="memory-flip-face relative h-full w-full">
        <button type="button" onClick={() => setBackside(true)} aria-label="사진을 뒤집어 메모 보기" className="absolute inset-0 z-0 block h-full w-full text-left">
          {activeMedia?.video ? <video src={activeMedia.src} muted playsInline preload="metadata" className="w-full h-full object-cover"/> : <img alt={item.title || `${item.author.name}의 조각`} className="w-full h-full object-cover select-none" src={activeMedia?.src}/>}
        </button>
        {item.title && item.photos.length <= 1 && <div className="absolute bottom-3 left-3 bg-[#ffffff]/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md -rotate-1 max-w-[85%]"><p className="stitch-serif text-[13px] text-[#221a14] font-medium leading-tight">“{item.title}”</p></div>}
        {item.photoCount > 1 && <span className={`absolute top-3 left-3 px-2 py-0.5 bg-[#ffffff]/85 backdrop-blur-xs rounded ${label} text-[#7d562d] font-[500]`}>{activePhoto + 1} / {visiblePhotos.length}{item.photoCount > visiblePhotos.length ? ` · 전체 ${item.photoCount}장` : ''} · {item.kind === 'record' ? '모아보기' : '사진'}</span>}
        {!backside && item.photos.length > 1 && item.photoCount <= 4 && <div className="absolute bottom-2 left-2 right-2 z-20 flex gap-1.5 overflow-x-auto no-scrollbar">{visiblePhotos.map((photo, idx) => <button key={photo.id} type="button" aria-label={`사진 ${idx + 1}`} aria-pressed={activePhoto === idx} onClick={() => setActivePhoto(idx)} className={`w-10 h-10 rounded-md overflow-hidden border-2 shrink-0 ${activePhoto === idx ? 'border-white ring-1 ring-[#99452c]' : 'border-white/60 opacity-75'}`}><img src={photo.src} alt="" className="w-full h-full object-cover"/></button>)}</div>}
      </div> : <RollingPaper item={item} photo={activeMedia} onComment={actions.onComment}/>}
      <button type="button" onClick={() => setBackside(v => !v)} aria-label={backside ? '사진 앞면 보기' : '사진 뒷면 메모 보기'} className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1.5 rounded-full shadow-xs text-[#221a14]"><Icon name="flip" className="text-[15px] text-[#99452c]"/><span className={`${label} font-[500]`}>{backside ? '사진 보기' : '뒷면 메모'}</span></button>
    </div>}
    {item.kind === 'record' && item.photoCount > 4 && days.length > 1 && <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3" aria-label="여행 날짜 선택">
      {days.map((day, dayIndex) => <button key={day} type="button" aria-pressed={selectedDay === day} onClick={() => { setSelectedDay(selectedDay === day ? null : day); setActivePhoto(0); }} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${selectedDay === day ? 'bg-[#99452c] text-white' : 'bg-[#fcebe0] text-[#55433d] hover:bg-[#f6e5db]'}`}>{dayIndex + 1}일차 <span className="opacity-75">{day.slice(5).replace('-', '.')}</span></button>)}
    </div>}
    {cover && item.kind === 'record' && item.photoCount > 4 && !backside && <div className="mt-2 grid grid-cols-3 gap-2" aria-label="여행 사진 모아보기">
      {visiblePhotos.slice(1, 3).map((photo, idx) => <button key={photo.id} type="button" aria-label={`${idx + 2}번째 여행 사진`} aria-pressed={activePhoto === idx + 1} onClick={() => setActivePhoto(idx + 1)} className={`relative aspect-[1.2] overflow-hidden rounded-lg bg-[#f6e5db] ${activePhoto === idx + 1 ? 'ring-2 ring-[#99452c] ring-offset-1' : ''}`}><img src={photo.src} alt="" className="h-full w-full object-cover"/></button>)}
      <button type="button" onClick={() => actions.onOpenBundle?.(item, 'gallery')} className="relative aspect-[1.2] overflow-hidden rounded-lg bg-[#fcebe0] flex flex-col items-center justify-center text-[#7d562d]"><Icon name="photo_library" className="text-[20px]"/><span className="text-sm font-bold">+{Math.max(item.photoCount - 3, 0)}</span><span className={`${label} mt-0.5`}>전체 보기</span></button>
    </div>}
    {!cover && item.title && <p className="stitch-serif text-[1.25rem] leading-[1.75rem] font-[500] text-[#221a14]">{item.title}</p>}
    {item.body && !(item.kind === 'record' && item.photoCount > 4) && <div className="pt-3 pb-1"><p className="stitch-sans text-[0.9375rem] font-[400] text-[#221a14] leading-relaxed whitespace-pre-line">{item.body}</p></div>}
    <div className="flex items-center gap-1.5 pt-3 pb-1">
      <button type="button" aria-pressed={item.liked} onClick={() => actions.onLike(item)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors ${item.liked ? 'bg-[#ffdbd1]' : 'bg-[#fcebe0] hover:bg-[#f6e5db]'}`}><span className="text-[13px]">💖</span><span className={`${label} text-[#221a14] font-semibold`}>{item.likes}</span></button>
      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fff1e9] text-[#55433d] ${label} font-[500]`}><Icon name="edit_note" className="text-[15px]"/>{item.commentCount}</span>
    </div>
    {!backside && <PhotoNotes item={item} photo={activeMedia} onComment={actions.onComment}/>}
    <div className="flex items-center justify-between pt-3 mt-1 text-[#55433d]">
      {item.kind === 'record' && item.photoCount > 4 ? <button type="button" onClick={() => actions.onOpenBundle?.(item, 'slideshow')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#fcebe0] transition-colors active:scale-95"><Icon name="cached" className="text-[18px] text-[#43664d]"/><span className={`${label} font-[500]`}>{item.photoCount}장 전체 슬라이드 & 뒷면 순회하기</span></button> : <button type="button" onClick={()=>setBackside(value=>!value)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#fcebe0] transition-colors active:scale-95"><Icon name="cached" className="text-[18px] text-[#43664d]"/><span className={`${label} font-[500]`}>비하인드 뒷면</span></button>}
      {item.kind === 'record' && item.photoCount > 4 ? <button type="button" onClick={() => actions.onOpenBundle?.(item, 'gallery')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#fcebe0] transition-colors active:scale-95"><Icon name="photo_library" className="text-[18px] text-[#7d562d]"/><span className={`${label} font-[500]`}>전체 사진 보기</span></button> : <Link href={joinedAlbumHref('ko',item.folderId,groupId??undefined)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#fcebe0] transition-colors active:scale-95"><Icon name="photo_library" className="text-[18px] text-[#7d562d]"/><span className={`${label} font-[500]`}>앨범 보기</span></Link>}
    </div>
  </article>;
}

function readGroup() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('group')) return params.get('group') || 'personal';
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function saveGroup(id: string | null) { try { localStorage.setItem(STORAGE_KEY, id ?? 'personal'); } catch { /* Remembering the crew is a convenience. */ } }
function forgetGroup() { try { localStorage.removeItem(STORAGE_KEY); } catch { /* Remembering the crew is a convenience. */ } }

async function fetchFeed(group: string | null): Promise<FeedData> {
  const params = new URLSearchParams({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  if (group) params.set('group', group);
  try { return await api<FeedData>(`/api/feed?${params}`); }
  catch (error) {
    // Browsing the first-visit feed must not require an account or create a guest
    // session. Real connection errors still use the retry screen.
    if (error instanceof Error && ['SESSION_REQUIRED','SESSION_EXPIRED'].includes(error.message)) return {me:'',groups:[],publicGroups:[],albums:[],crew:{id:null,name:null,ownerId:null,members:[]},month:{count:0,today:0,goal:25,contributors:[]},items:[]};
    // A remembered crew the viewer has since left falls back to the default one.
    if (group && group !== 'personal' && error instanceof Error && error.message === 'GROUP_NOT_FOUND') { forgetGroup(); return fetchFeed(null); }
    throw error;
  }
}
const commentErrors: Record<string, string> = { TERMS_REQUIRED: '커뮤니티 규칙 동의 후 댓글을 남길 수 있어요.', RATE_LIMITED: '잠시 후 다시 남겨 주세요.', ACCOUNT_SUSPENDED: '지금은 댓글을 남길 수 없어요.' };

export default function HomeFeed() {
  const [data, setData] = useState<FeedData | null>(null);
  const [failed, setFailed] = useState(false);
  const request = useRef(0);
  const currentGroup = useRef<string | null | undefined>(undefined);
  const load = useCallback((group: string | null) => {
    const requestId = ++request.current;
    return fetchFeed(group).then(feed => {
      if (requestId !== request.current) return;
      const selected = feed.crew.id;
      currentGroup.current = selected;
      saveGroup(selected);
      const url = new URL(window.location.href);
      const urlGroup = url.searchParams.get('group');
      const canonicalGroup = selected ?? 'personal';
      if (urlGroup !== canonicalGroup) { url.searchParams.set('group', canonicalGroup); window.history.replaceState(window.history.state, '', url); }
      setData(feed); setFailed(false);
    }, () => { if (requestId === request.current) setFailed(true); });
  }, []);
  useEffect(() => { void load(readGroup()); }, [load]);
  useEffect(() => {
    const restoreGroup = () => {
      const selected = readGroup();
      if ((selected ?? 'personal') === (currentGroup.current ?? 'personal')) return;
      setData(null);
      void load(selected);
    };
    window.addEventListener('popstate', restoreGroup);
    return () => window.removeEventListener('popstate', restoreGroup);
  }, [load]);
  const actions: FeedActions = {
    onSelectGroup(id) {
      saveGroup(id);
      const url = new URL(window.location.href);
      url.searchParams.set('group', id ?? 'personal');
      url.searchParams.delete('album'); url.searchParams.delete('photo'); url.searchParams.delete('view');
      window.history.pushState({ ...(window.history.state || {}), feedGroup: id ?? 'personal' }, '', url);
      setData(null); void load(id ?? 'personal');
    },
    async onCreateGroup(name,isPublic=false) { const result = await api<{id:string}>('/api/groups', { method: 'POST', body: JSON.stringify({ name,isPublic }) }); saveGroup(result.id); setData(null); await load(result.id); },
    async onJoinPublicGroup(id) { await api('/api/groups',{method:'PATCH',body:JSON.stringify({id,action:'joinPublic'})});saveGroup(id);const url=new URL(window.location.href);url.searchParams.set('group',id);url.searchParams.delete('album');url.searchParams.delete('photo');url.searchParams.delete('view');window.history.pushState({...window.history.state,feedGroup:id},'',url);setData(null);await load(id); },
    onLike(item) {
      const toggle = (liked: boolean) => setData(d => d && { ...d, items: d.items.map(i => i.kind === item.kind && i.id === item.id ? { ...i, liked, likes: i.likes + (liked ? 1 : -1) } : i) });
      toggle(!item.liked);
      api('/api/discussion', { method: 'POST', body: JSON.stringify({ kind: item.kind, targetId: item.id, action: 'like', liked: !item.liked }) }).catch(() => toggle(item.liked));
    },
    async onComment(item, body, options) {
      try {
        await api('/api/discussion', { method: 'POST', body: JSON.stringify({ kind: item.kind, targetId: item.id, action: 'comment', id: crypto.randomUUID(), body, ...options }) });
        await load(data?.crew.id ?? 'personal');
        return null;
      } catch (error) { return commentErrors[error instanceof Error ? error.message : ''] ?? '댓글을 남기지 못했어요.'; }
    },
    async onDelete(item) {
      try {
        await api(item.kind === 'record' ? '/api/memories' : '/api/photos', { method: 'DELETE', body: JSON.stringify({ id: item.id }) });
        await load(data?.crew.id ?? 'personal');
        return null;
      } catch { return '게시물을 삭제하지 못했어요. 권한과 연결을 확인해 주세요.'; }
    },
    onRefresh() { void load(data?.crew.id ?? 'personal'); },
  };
  if (data) return <CrewFeedView data={data} actions={actions}/>;
  return <div className={`${stitchRoot} h-screen flex flex-col items-center justify-center gap-3 bg-[#fff8f5] text-[#55433d] px-6 text-center`} style={{ fontFamily: sansStack }}>
    <StitchIconFont/>
    {failed
      ? <><p className="stitch-sans text-[0.9375rem]">피드를 불러오지 못했어요.</p><div className="flex gap-2"><button type="button" onClick={() => { setFailed(false); void load(readGroup()); }} className="px-4 py-2 rounded-xl bg-[#99452c] text-[#ffffff] stitch-sans text-[0.8125rem] font-semibold">다시 시도</button><Link href="/crew/photos" className="px-4 py-2 rounded-xl bg-[#fcebe0] stitch-sans text-[0.8125rem] font-semibold">사진 서랍으로 가기</Link></div></>
      : <MemoryLoading/>}
  </div>;
}
