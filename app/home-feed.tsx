"use client";
/* eslint-disable @next/next/no-img-element -- Photo URLs need the viewer's session cookie; an optimizer cannot fetch them. */
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '@/lib/client-api';
import { Icon, StitchIconFont, sansStack, stitchRoot } from './stitch-kit';

// The signed-in home: the Stitch "프라이빗 크루 데일리 홈 피드" layout filled with the viewer's own crew.
// Parts of the mockup with no data behind them (online presence, voice memos, sticker counts) are left out.
type Person = { id: string; name: string; mine: boolean };
type Media = { id: string; src: string; video: boolean; day: string | null };
export type FeedItem = { kind: 'photo' | 'record'; id: string; folderId: string; album: string; author: Person; createdAt: string; title: string; body: string; photos: Media[]; photoCount: number; comments: { id: string; body: string; author: Person; createdAt: string }[]; commentCount: number; likes: number; liked: boolean };
export type FeedData = { me: string; groups: { id: string; name: string; members: number }[]; crew: { id: string | null; name: string | null; ownerId: string | null; members: Person[] }; month: { count: number; today: number; goal: number; contributors: Person[] }; items: FeedItem[] };

const STORAGE_KEY = 'memonestia.feedGroup';
const avatarTones = ['bg-[#bf9061] text-[#492a04]', 'bg-[#f0dfd5] text-[#55433d]', 'bg-[#ffb5a0] text-[#3b0900]', 'bg-[#c2e9c9] text-[#486a51]'];
const tone = (person: Person) => person.mine ? 'bg-[#99452c] text-[#ffffff]' : avatarTones[[...person.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % avatarTones.length];
const initial = (person: Person) => person.mine ? '나' : [...person.name.trim()][0] || '?';
const label = 'stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em]';

function ago(iso: string) {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return '방금 전';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}일 전`;
  return new Intl.DateTimeFormat('ko', { month: 'long', day: 'numeric' }).format(new Date(iso));
}
const detailHref = (item: FeedItem) => item.kind === 'photo' ? `/?lang=ko&album=${item.folderId}&photo=${item.id}` : `/?lang=ko&album=${item.folderId}&view=timeline`;
const galleryHref = (item: FeedItem) => `/?lang=ko&album=${item.folderId}&view=photos`;

export type FeedActions = { onSelectGroup: (id: string | null) => void; onLike: (item: FeedItem) => void; onComment: (item: FeedItem, body: string) => Promise<string | null>; onOpenBundle?: (item: FeedItem, mode: 'gallery' | 'slideshow') => void };

export function CrewFeedView({ data, actions }: { data: FeedData; actions: FeedActions }) {
  const [feedFilter, setFeedFilter] = useState<'all' | 'trips' | 'month' | 'notes'>('all');
  const [picking, setPicking] = useState(false);
  const [fullBundle, setFullBundle] = useState<{ item: FeedItem; mode: 'gallery' | 'slideshow' } | null>(null);
  const { crew, month } = data;
  useEffect(() => { const filter = new URLSearchParams(window.location.search).get('filter'); if (filter === 'notes' || filter === 'trips' || filter === 'month') setFeedFilter(filter); }, []);
  const crewHref = `/?lang=ko&section=rooms${crew.id ? `&group=${crew.id}` : ''}`;
  const screenHref = (next: 'home'|'photos'|'behind'|'settings') => next === 'home' ? '/?lang=ko&home=1' : `/crew/${next}`;
  const remaining = Math.max(month.goal - month.count, 0);
  const percent = Math.min(Math.round(month.count / month.goal * 100), 100);
  const items = data.items.filter(item => {
    if (feedFilter === 'trips') return item.kind === 'record' && item.photoCount > 4;
    if (feedFilter === 'month') { const date = new Date(item.createdAt); const now = new Date(); return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(); }
    if (feedFilter === 'notes') return item.commentCount > 0 || Boolean(item.body.trim());
    return true;
  });
  const invite = crew.id && <Link href={crewHref} className="flex items-center gap-1.5 bg-[#f6e5db] hover:bg-[#f0dfd5] transition-colors px-2.5 py-1.5 rounded-full shrink-0 text-[#55433d] active:scale-95"><div className="w-6 h-6 rounded-full border-2 border-dashed border-[#88726c] flex items-center justify-center text-[#99452c]"><Icon name="person_add" className="text-[14px]"/></div><span className={`${label} font-medium`}>+ 친구 초대</span></Link>;
  if (fullBundle) return <FullBundleView item={fullBundle.item} initialMode={fullBundle.mode} onBack={() => setFullBundle(null)} actions={actions}/>;
  return <div className={`${stitchRoot} h-screen overflow-y-auto bg-[#fff8f5] text-[#221a14] antialiased`} style={{ fontFamily: sansStack }}>
    <StitchIconFont/>
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-[1200px] z-50 pt-[env(safe-area-inset-top,0px)] bg-[#fff8f5]/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] md:rounded-b-2xl md:border-x md:border-b md:border-[#efdfd5]">
      <div className="px-5 pt-2 pb-2 flex flex-col gap-2 md:px-8 md:py-4 md:gap-3">
        <div className="h-8 flex items-center justify-between md:h-9">
          <span className="stitch-serif text-[1.12rem] font-semibold text-[#99452c]">메모네스티아</span>
          <div className="flex items-center gap-2"><Link href="/?lang=ko&login=1" aria-label="알림" className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#55433d] shadow-sm"><Icon name="favorite_border" className="text-[18px]"/></Link><Link href="/?lang=ko&login=1" aria-label="내 계정" className="w-8 h-8 rounded-full bg-[#99452c] flex items-center justify-center shadow-[0_2px_8px_rgba(153,69,44,0.2)]"><Icon name="person" className="text-[#ffffff] text-[18px]"/></Link></div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button type="button" aria-expanded={picking} onClick={() => setPicking(v => !v)} className="flex items-center gap-1.5 min-w-0 text-left group">
            <span className="stitch-serif text-[1.15rem] font-semibold text-[#221a14] truncate">{crew.name ?? '내 공간'}</span><Icon name="expand_more" className="text-[18px] text-[#55433d] group-hover:translate-y-0.5 transition-transform"/>
          </button>
          {invite}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" aria-label="크루 멤버">
          {crew.members.map(m => <div key={m.id} className="flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-full shrink-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${label} ${m.mine ? 'font-bold' : 'font-[500]'} ${tone(m)}`}>{initial(m)}</div><span className="text-[10px] text-[#55433d]">{m.mine ? '나' : m.name}</span>
          </div>)}
        </div>
      </div>
    </header>
    <main className="flex flex-col relative w-full max-w-md md:max-w-[1200px] mx-auto pt-[9.6rem] md:pt-[11rem] pb-24 bg-[#fff8f5] min-h-screen px-[1.25rem] md:px-8">
      <div className="flex flex-col w-full pb-8">
        <section className="flex flex-col gap-[0.5rem] pt-[0.25rem] mb-[1rem]">
          {picking && <div role="menu" className="relative z-40 min-w-[12rem] bg-[#ffffff] rounded-xl shadow-[0_8px_24px_rgba(112,100,92,0.18)] p-1.5 flex flex-col">
              {[...data.groups.map(g => ({ id: g.id as string | null, name: g.name, members: g.members })), { id: null, name: '내 공간', members: 1 }].map(g =>
                <button key={g.id ?? 'personal'} role="menuitem" type="button" onClick={() => { setPicking(false); actions.onSelectGroup(g.id); }} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left hover:bg-[#fcebe0] ${g.id === crew.id ? 'bg-[#fff1e9] text-[#99452c] font-bold' : 'text-[#221a14]'}`}>
                  <span className="stitch-sans text-[0.875rem] leading-[1.25rem] truncate">{g.name}</span><span className={`${label} text-[#88726c] shrink-0`}>{g.id ? `${g.members}명` : '나만'}</span>
                </button>)}
          </div>}
        </section>
        <section className="relative mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-[#fcebe0] to-[#f6e5db] px-3.5 py-3 md:px-6 md:py-5 md:rounded-2xl shadow-[0_4px_16px_-2px_rgba(112,100,92,0.08)]">
          <div className="flex items-center justify-between gap-2"><span className={`${label} font-semibold text-[#55433d]`}>이번 달 모인 조각</span><span className="text-xs font-bold text-[#99452c]">{month.count} / {month.goal}개</span></div>
          <div className="w-full bg-white/80 h-2 rounded-full overflow-hidden p-0.5 shadow-inner mt-2"><div className="bg-[#99452c] h-full rounded-full transition-all" style={{ width: `${percent}%` }}/></div>
          <div className="flex items-center justify-between gap-2 mt-2"><span className={`${label} text-[#55433d] truncate`}>{remaining ? `우리 크루가 함께 ${remaining}조각 더 모아요` : '이번 달 조각을 모두 모았어요 🎉'}</span><span className="flex items-center -space-x-1.5 shrink-0">{month.contributors.slice(0, 4).map(p => <span key={p.id} className={`w-5 h-5 rounded-full border border-[#f6e5db] text-[9px] flex items-center justify-center ${p.mine ? 'font-bold' : ''} ${tone(p)}`}>{initial(p)}</span>)}</span></div>
        </section>
        <section className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-4 md:mb-6" aria-label="피드 보기">
          {([{ id: 'all', text: '전체 피드' }, { id: 'trips', text: '✈️ 여행·이벤트' }, { id: 'month', text: '📅 이번 달' }, { id: 'notes', text: '🏷️ 뒷면 낙서' }] as const).map(filter => <button key={filter.id} type="button" aria-pressed={feedFilter === filter.id} onClick={() => setFeedFilter(filter.id)} className={`px-3 py-1.5 rounded-full ${label} shrink-0 transition-colors ${feedFilter === filter.id ? 'bg-[#99452c] text-white font-semibold shadow-xs' : 'bg-[#fcebe0] text-[#55433d] hover:bg-[#f6e5db]'}`}>{filter.text}</button>)}
        </section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 xl:gap-10">
          {items.map((item, index) => <FeedCard key={item.kind + item.id} item={item} index={index} owner={crew.ownerId} actions={{...actions,onOpenBundle:(bundle,mode)=>setFullBundle({item:bundle,mode})}}/>)}
          {!items.length && <div className="flex flex-col items-center text-center gap-2 bg-[#ffffff] rounded-2xl shadow-[0_4px_20px_-2px_rgba(112,100,92,0.08)] px-5 py-10">
            <Icon name="photo_library" className="text-[32px] text-[#bf9061]"/>
            <p className="stitch-serif text-[1.25rem] leading-[1.75rem] font-[500]">{feedFilter === 'trips' ? '아직 여행 묶음이 없어요' : feedFilter === 'month' ? '이번 달 기록이 아직 없어요' : feedFilter === 'notes' ? '뒷면 낙서가 아직 없어요' : '아직 올라온 조각이 없어요'}</p>
            <p className="stitch-sans text-[0.8125rem] leading-[1.25rem] text-[#55433d]">첫 사진을 올리면 {crew.id ? '크루 모두의' : '나만의'} 피드가 시작돼요.</p>
          </div>}
        </div>
        <div className="sticky bottom-3 mt-6 z-30 self-center w-full max-w-sm px-2">
          <Link href="/?lang=ko&quick=1" className="w-full flex items-center justify-center gap-2 bg-[#99452c] hover:bg-[#7b2e17] text-[#ffffff] py-3 px-5 rounded-2xl shadow-[0_8px_24px_rgba(153,69,44,0.35)] active:scale-98 transition-all group">
            <Icon name="photo_camera" className="text-[20px] transition-transform group-hover:rotate-[-8deg]"/>
            <span className="stitch-sans text-[0.875rem] leading-[1.25rem] font-[600] tracking-wide">새 여행 조각 묶음 올리기</span><span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">최대 30장</span>
          </Link>
        </div>
      </div>
    </main>
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-2xl z-50 pb-[env(safe-area-inset-bottom,0px)] bg-[#fff8f5]/95 backdrop-blur-xl shadow-[0_-2px_12px_rgba(112,100,92,0.06)] md:rounded-t-2xl md:border-x md:border-t md:border-[#efdfd5]">
      <div className="h-16 px-[0.875rem] flex items-center justify-around md:h-[4.5rem]">
        {[{ href: screenHref('home'), icon: 'cottage', text: '홈 피드', current: true }, { href: screenHref('photos'), icon: 'photo_library', text: '사진 서랍' }, { href: screenHref('behind'), icon: 'sticky_note_2', text: '비하인드' }, { href: screenHref('settings'), icon: 'settings', text: '크루 설정' }].map(tab =>
          <Link key={tab.text} href={tab.href} aria-current={tab.current ? 'page' : undefined} className={`flex flex-col items-center justify-center w-14 h-12 transition-colors ${tab.current ? 'text-[#99452c] font-bold' : 'text-[#55433d] hover:text-[#221a14]'}`}><Icon name={tab.icon} className="text-[22px]"/><span className={`${label} font-[500] mt-0.5`}>{tab.text}</span></Link>)}
      </div>
    </nav>
  </div>;
}

export function StitchSubpage({title,crewName,crewMemberCount=1,screen,screenHref,children}:{title:string;crewName:string;crewMemberCount?:number;screen:'photos'|'behind'|'settings';screenHref:(next:'home'|'photos'|'behind'|'settings')=>string;children:ReactNode}) {
  return <div className={`${stitchRoot} fixed inset-0 z-[60] flex flex-col bg-[#fff8f5] text-[#30251f] antialiased`} style={{fontFamily:sansStack}}>
    <StitchIconFont/>
    {screen==='behind'?<header className="z-20 w-full border-b border-[#efdfd5]/70 bg-[#fff8f5]/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl"><div className="mx-auto max-w-md px-4"><div className="flex h-[52px] items-center justify-between gap-2"><Link href={screenHref('home')} className="stitch-serif text-[15px] font-semibold tracking-tight text-[#99452c]">메모네스티아</Link><div className="flex min-w-0 items-center gap-1.5"><button type="button" className="flex max-w-[150px] items-center gap-1 rounded-full bg-[#f6e5db] px-2.5 py-1.5 text-[9px] font-semibold text-[#7d562d]"><span className="truncate">{crewName}</span><Icon name="expand_more" className="text-sm"/></button><button type="button" aria-label="알림" className="flex h-8 w-8 items-center justify-center rounded-full text-[#55433d]"><Icon name="notifications" className="text-[18px]"/></button><Link href={screenHref('settings')} aria-label="크루 설정" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#99452c] text-white"><Icon name="person" className="text-[16px]"/></Link></div></div></div></header>:<header className="z-20 border-b border-[#efdfd5] bg-[#fff8f5]/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] backdrop-blur-xl"><div className="mx-auto flex max-w-md items-center justify-between md:max-w-6xl"><Link href={screenHref('home')} aria-label="홈 피드" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#55433d] shadow-sm"><Icon name="arrow_back" className="text-[20px]"/></Link><div className="min-w-0 text-center"><span className="block truncate text-[10px] text-[#88726c]">{crewName}</span><h1 className="stitch-serif truncate text-base font-semibold text-[#30251f]">{title}</h1></div><Link href={screenHref('settings')} aria-label="크루 설정" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fcebe0] text-[#99452c]"><Icon name="settings" className="text-[20px]"/></Link></div></header>}
    <main className={`mx-auto w-full max-w-md flex-1 overflow-y-auto px-5 pb-24 pt-5 ${screen==='behind'?'':'md:max-w-6xl md:px-8 md:pt-8'}`}>{children}</main>
    <nav className={`fixed bottom-0 left-1/2 z-30 grid h-[calc(64px+env(safe-area-inset-bottom))] w-full ${screen==='behind'?'max-w-md':'max-w-md md:max-w-2xl'} -translate-x-1/2 grid-cols-4 border-t border-[#efdfd5] bg-[#fff8f5]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:rounded-t-2xl md:border-x md:border-[#efdfd5]`} aria-label="주요 메뉴">
      {[{key:'home',icon:'cottage',text:'홈 피드'},{key:'photos',icon:'photo_library',text:'사진 서랍'},{key:'behind',icon:'sticky_note_2',text:'비하인드'},{key:'settings',icon:'settings',text:'크루 설정'}].map(tab=><Link key={tab.key} href={screenHref(tab.key as 'home'|'photos'|'behind'|'settings')} aria-current={screen===tab.key?'page':undefined} className={`flex flex-col items-center justify-center gap-1 text-[10px] ${screen===tab.key?'font-bold text-[#99452c]':'text-[#78675e]'}`}><Icon name={tab.icon} className="text-[21px]"/><span>{tab.text}</span></Link>)}
    </nav>
  </div>;
}

type DrawerRoom={id:string;groupId:string|null;name:string;category:string;count:number;image:string};
type DrawerPhoto={id:string;roomId:string;name:string;src:string;mediaType:string;created:number;mine?:boolean};
type DrawerNote={id:string;body:string;author:string;mine:boolean;createdAt:string};
export function StitchPhotoDrawer({groupId}:{groupId:string|null}) {
  const [rooms,setRooms]=useState<DrawerRoom[]>([]),[photos,setPhotos]=useState<DrawerPhoto[]>([]),[roomId,setRoomId]=useState<string|null>(null),[monthKey,setMonthKey]=useState<string|null>(null),[sort,setSort]=useState<'latest'|'oldest'>('latest'),[grid,setGrid]=useState(true),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
  useEffect(()=>{let active=true;api<{rooms:DrawerRoom[];photos:DrawerPhoto[]}>('/api/workspace').then(result=>{if(active){const matching=result.rooms.filter(room=>(room.groupId||null)===groupId);const ids=new Set(matching.map(room=>room.id));setRooms(matching);setPhotos(result.photos.filter(photo=>ids.has(photo.roomId)));setFailed(false);}}).catch(()=>{if(active)setFailed(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[groupId]);
  const months=[...new Set(photos.map(photo=>{const date=new Date(photo.created);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}))].sort().reverse();
  const visible=photos.filter(photo=>(!roomId||photo.roomId===roomId)&&(!monthKey||`${new Date(photo.created).getFullYear()}-${String(new Date(photo.created).getMonth()+1).padStart(2,'0')}`===monthKey)).sort((a,b)=>sort==='latest'?b.created-a.created:a.created-b.created),activeRoom=rooms.find(room=>room.id===roomId),recent=photos.slice().sort((a,b)=>b.created-a.created).slice(0,9),featuredMonth=months[0],featuredLabel=featuredMonth?new Intl.DateTimeFormat('ko-KR',{month:'long'}).format(new Date(`${featuredMonth}-01T00:00:00`)):'이번 달';
  return <>
    <section className="mb-5 flex flex-col gap-3 pt-2"><div className="flex items-start justify-between gap-2"><div><span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[#e5efe3] px-2.5 py-1 text-[10px] font-semibold text-[#527452]"><Icon name="auto_stories" className="text-sm"/>공동 사진 보관함</span><h2 className="stitch-serif flex items-center gap-1.5 text-[1.65rem] font-semibold tracking-tight text-[#30251f] md:text-3xl">우리들의 사진 서랍 <span className="text-xl">🗄️</span></h2><p className="mt-1 text-xs leading-snug text-[#78675e] md:text-sm">차곡차곡 쌓인 우리 크루의 모든 순간과 숨겨진 사진 뒷면 이야기</p></div><div className="flex shrink-0 items-center gap-1 pt-1"><button type="button" onClick={()=>setSort(sort==='latest'?'oldest':'latest')} className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#55433d] shadow-sm"><Icon name="history_edu" className="text-sm text-[#99452c]"/>{sort==='latest'?'최신순':'오래된순'}<Icon name="expand_more" className="text-sm"/></button><button type="button" aria-label="보기 방식 전환" onClick={()=>setGrid(v=>!v)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#78675e] shadow-sm"><Icon name={grid?'grid_view':'photo_library'} className="text-lg"/></button></div></div></section>
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="사진 서랍 필터"><button type="button" onClick={()=>{setRoomId(null);setMonthKey(null)}} aria-pressed={!roomId&&!monthKey} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold ${!roomId&&!monthKey?'bg-[#dc765a] text-white shadow-sm':'bg-white text-[#78675e]'}`}>전체 <span className="ml-0.5 opacity-80">{photos.length}</span></button>{months.slice(0,4).map(month=><button key={month} type="button" onClick={()=>{setRoomId(null);setMonthKey(month)}} aria-pressed={monthKey===month} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold ${monthKey===month?'bg-[#dc765a] text-white shadow-sm':'bg-white text-[#78675e]'}`}>{new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long'}).format(new Date(`${month}-01T00:00:00`))} <span className="ml-0.5 opacity-70">{photos.filter(p=>`${new Date(p.created).getFullYear()}-${String(new Date(p.created).getMonth()+1).padStart(2,'0')}`===month).length}</span></button>)}{rooms.slice(0,3).map(room=><button key={room.id} type="button" onClick={()=>{setRoomId(room.id);setMonthKey(null)}} aria-pressed={roomId===room.id} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold ${roomId===room.id?'bg-[#dc765a] text-white shadow-sm':'bg-white text-[#78675e]'}`}>{room.name}</button>)}</div>
    <section className="mb-7 px-0.5"><div className="relative overflow-hidden rounded-xl bg-white p-4 shadow-[0_4px_18px_-2px_rgba(112,100,92,0.08)] md:p-6"><span className="absolute -top-2 left-1/2 h-5 w-24 -translate-x-1/2 rotate-1 bg-[#f4d19b]/60 shadow-sm"/><div className="flex items-start justify-between gap-3 pt-1"><div><div className="flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-[#e27d60]"/><span className="text-[10px] font-bold uppercase tracking-wide text-[#99452c]">Lookbook Special</span></div><h3 className="stitch-serif mt-1 text-lg font-semibold text-[#30251f] md:text-xl">{featuredLabel}의 9컷 룩북 완성 ✨</h3><p className="mt-1 text-[11px] text-[#78675e]">이번 달 조각 {Math.min(photos.length,9)}개가 모여 완성되었습니다</p></div><div className="grid h-16 w-16 shrink-0 grid-cols-3 gap-0.5 overflow-hidden rounded-lg bg-[#f3e5dc] p-1 shadow-inner md:h-20 md:w-20">{recent.slice(0,9).map(photo=><img key={photo.id} src={photo.src} alt="" className="h-full w-full rounded-[2px] object-cover"/>)}</div></div><div className="mt-4 flex gap-2 rounded-lg bg-[#f8f2ee] p-2"><button type="button" onClick={()=>document.getElementById('polaroidGrid')?.scrollIntoView({behavior:'smooth',block:'center'})} className="flex-1 rounded-lg bg-[#dc765a] px-3 py-2 text-[10px] font-semibold text-white">9컷 룩북 카드 열기</button><button type="button" onClick={()=>setMonthKey(featuredMonth??null)} className="flex items-center justify-center gap-1 rounded-lg bg-white px-3 py-2 text-[10px] font-semibold text-[#78675e]"><Icon name="share" className="text-sm text-[#bd624a]"/>이달 사진 보기</button></div></div></section>
    <section className="mb-7"><div className="mb-3 flex items-center justify-between"><h3 className="stitch-serif flex items-center gap-1.5 text-lg font-semibold text-[#30251f]"><Icon name="photo_library" className="text-xl text-[#99452c]"/>특별한 날 모아보기</h3><span className="text-[10px] text-[#78675e]">{rooms.length}개 앨범</span></div><div className="flex gap-3.5 overflow-x-auto pb-2 no-scrollbar">{rooms.map(room=><button key={room.id} type="button" onClick={()=>{setRoomId(roomId===room.id?null:room.id);setMonthKey(null)}} aria-pressed={roomId===room.id} className={`relative w-64 shrink-0 rounded-xl bg-white p-3 text-left shadow-[0_4px_14px_-2px_rgba(112,100,92,0.08)] transition-transform active:scale-[.99] ${roomId===room.id?'ring-2 ring-[#e27d60]':''}`}><span className="absolute -top-1.5 right-4 h-4 w-12 rotate-3 bg-[#e8d5a9]/70"/><div className="relative mb-2.5 h-36 overflow-hidden rounded-lg bg-[#f3e5dc]">{room.image&&<img src={room.image} alt="" className="h-full w-full object-cover"/>}<div className="absolute inset-0 bg-gradient-to-t from-[#30251f99] to-transparent"/><span className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-semibold text-white"><Icon name="photo_camera" className="text-sm"/>{room.count}장 · 함께 모은 추억</span></div><b className="block truncate text-[13px] text-[#30251f]">{room.name}</b><span className="mt-0.5 block truncate text-[11px] text-[#78675e]">{room.category} · 사진과 뒷면 낙서를 모아봐요</span></button>)}</div></section>
    <section className="mb-7"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="stitch-serif flex items-center gap-1.5 text-lg font-semibold text-[#30251f]"><Icon name="photo_library" className="text-xl text-[#7a8f6b]"/>사진 조각들</h3><span className="flex items-center gap-1 rounded-full bg-[#f2ece6] px-2.5 py-1 text-[10px] text-[#78675e]"><Icon name="sync" className="text-sm text-[#99452c]"/>사진을 누르면 뒷면 낙서로 휙!</span></div>
      {failed?<div className="rounded-xl bg-white p-5 text-center text-sm text-[#78675e]">사진 서랍을 불러오지 못했어요. 잠시 후 다시 열어주세요.</div>:loading?<div className="rounded-xl bg-white p-8 text-center text-sm text-[#78675e]">앨범을 펼치는 중…</div>:!visible.length?<div className="rounded-xl border border-[#efdfd5] bg-white p-8 text-center"><span className="text-3xl">🧺</span><p className="stitch-serif mt-2 text-lg font-semibold">아직 모인 사진이 없어요</p><p className="mt-1 text-sm text-[#78675e]">크루 앨범에 사진을 담으면 여기에 펼쳐져요.</p></div>:<div id="polaroidGrid" className={`grid ${grid?'grid-cols-2':'grid-cols-1'} gap-3 pt-1 md:grid-cols-3 xl:grid-cols-4 md:gap-5`}>{visible.map((photo,index)=><DrawerPhotoCard key={photo.id} photo={photo} index={index} roomName={rooms.find(room=>room.id===photo.roomId)?.name??''}/>)}</div>}
    </section>
    <footer className="rounded-xl bg-[#f2eee8] p-4 text-center shadow-sm"><div className="flex items-center justify-center gap-1.5 text-[10px] text-[#78675e]"><Icon name="verified" className="text-base text-[#7a8f6b]"/>모든 사진과 원본은 크루원에게만 안전하게 보관됩니다.</div><p className="mt-1 text-[9px] text-[#9a8981]">공유 범위는 사진마다 설정한 크루 공개 기준을 따릅니다.</p></footer>
  </>;
}

function DrawerPhotoCard({photo,index,roomName}:{photo:DrawerPhoto;index:number;roomName:string}) {
  const [flipped,setFlipped]=useState(false),[notes,setNotes]=useState<DrawerNote[]>([]),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{if(!flipped)return;let active=true;api<{comments:DrawerNote[]}>('/api/discussion?kind=photo&id='+encodeURIComponent(photo.id)).then(result=>{if(active)setNotes(result.comments)}).catch(()=>{});return()=>{active=false};},[flipped,photo.id]);
  async function submit(event:FormEvent){event.preventDefault();if(!draft.trim()||busy)return;setBusy(true);setError('');try{await api('/api/discussion',{method:'POST',body:JSON.stringify({kind:'photo',targetId:photo.id,action:'comment',id:crypto.randomUUID(),body:draft.trim()})});const result=await api<{comments:DrawerNote[]}>('/api/discussion?kind=photo&id='+encodeURIComponent(photo.id));setNotes(result.comments);setDraft('')}catch{setError('낙서를 남기지 못했어요. 다시 시도해 주세요.')}finally{setBusy(false)}}
  const date=new Date(photo.created),tape=['bg-[#e8d5a9]/70','bg-[#d5e6ce]/75','bg-[#f4d19b]/60','bg-[#d9e8e8]/75'][index%4];
  return <article className={`relative rounded-xl bg-white p-2 pb-3.5 shadow-[0_4px_16px_-2px_rgba(112,100,92,0.08)] transition-transform hover:rotate-0 ${index%4===0?'-rotate-[.8deg]':index%4===1?'rotate-[1deg]':index%4===2?'rotate-[.6deg]':'-rotate-[1deg]'}`}><span className={`absolute -top-2 left-1/2 z-10 h-3.5 w-12 -translate-x-1/2 rotate-2 rounded-sm ${tape}`}/><button type="button" onClick={()=>setFlipped(v=>!v)} aria-label={flipped?'사진 앞면 보기':'사진 뒷면 낙서 보기'} className="relative block w-full overflow-hidden rounded-lg bg-[#f3e5dc] text-left"><div className="aspect-[4/5]">{photo.mediaType==='video'?<video src={photo.src} muted playsInline preload="metadata" className="h-full w-full object-cover"/>:<img src={photo.src} alt={photo.name||roomName||'크루 사진'} className="h-full w-full object-cover"/>}</div>{flipped?<div className="absolute inset-0 flex flex-col bg-[#fff5d7]/95 p-3 text-[#4a3a2c]"><div className="flex items-center justify-between"><b className="stitch-serif text-sm">사진 뒷면 낙서</b><span className="text-[10px]">{notes.length}개</span></div><div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto">{notes.length?notes.slice(-4).map(note=><p key={note.id} className="rounded-lg bg-white/75 p-2 text-[10px] leading-4"><b>{note.mine?'나':note.author}</b> · {note.body}</p>):<p className="mt-4 text-center text-[10px] leading-5 text-[#78675e]">아직 뒷면 낙서가 없어요.<br/>첫 한마디를 남겨보세요 ✨</p>}</div><form onSubmit={submit} className="mt-2 flex gap-1"><input value={draft} onChange={e=>setDraft(e.target.value)} aria-label="사진 뒷면 낙서" placeholder="한마디 남기기" className="min-w-0 flex-1 rounded-lg border border-[#eadcc1] bg-white px-2 py-1.5 text-[10px] outline-none"/><button disabled={busy||!draft.trim()} className="rounded-lg bg-[#99452c] px-2 text-[10px] font-bold text-white disabled:opacity-50">등록</button></form>{error&&<p role="alert" className="mt-1 text-[9px] text-red-700">{error}</p>}</div>:<><span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#30251f99] text-white backdrop-blur"><Icon name="flip" className="text-[13px]"/></span>{photo.mediaType==='video'&&<span className="absolute bottom-2 left-2 rounded-full bg-[#30251fcc] px-2 py-1 text-[9px] text-white">VIDEO</span>}</>}</button><div className="space-y-1.5 px-0.5 pt-2"><div className="flex items-center justify-between gap-2 text-[10px] text-[#78675e]"><span className="truncate">{new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit'}).format(date)} {photo.name||roomName}</span><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${photo.mine?'bg-[#f2d5c8] text-[#99452c]':'bg-[#dcebd9] text-[#527452]'}`}>{photo.mine?'나':'크'}</span></div><button type="button" onClick={()=>setFlipped(v=>!v)} className="flex w-full items-center justify-between rounded-full bg-[#e8f0e4] px-2 py-1 text-[9px] font-medium text-[#527452]"><span className="flex items-center gap-1"><Icon name="chat_bubble_outline" className="text-[13px]"/>뒷면 낙서</span><span className="font-bold">{notes.length||'보기'}</span></button></div></article>;
}

type BehindRecord={id:string;kind:string;title:string;body:string;day:string;created:number;photos:{id:string;src:string;mediaType:string;body:string}[]};
type BehindRoom={id:string;groupId:string|null;name:string};
export function StitchBehind({groupId}:{groupId:string|null}) {
  const [records,setRecords]=useState<(BehindRecord&{album:string;folderId:string})[]>([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[notes,setNotes]=useState<Record<string,{id:string;body:string;author:string;mine:boolean;createdAt?:string}[]>>({}),[filter,setFilter]=useState<'all'|'new'|'mine'|'anonymous'>('all'),[secret,setSecret]=useState(''),[secretSent,setSecretSent]=useState(false);
  useEffect(()=>{let alive=true;async function load(){try{const workspace=await api<{rooms:BehindRoom[]}>('/api/workspace');const rooms=workspace.rooms.filter(room=>(room.groupId||null)===groupId);const batches=await Promise.all(rooms.map(async room=>{const result=await api<{items:BehindRecord[]}>('/api/memories?folderId='+encodeURIComponent(room.id)+'&timezone='+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone));return result.items.filter(item=>item.kind==='record').map(item=>({...item,album:room.name,folderId:room.id}));}));if(alive)setRecords(batches.flat().sort((a,b)=>b.created-a.created));}catch{if(alive)setFailed(true);}finally{if(alive)setLoading(false);}}void load();return()=>{alive=false;};},[groupId]);
  useEffect(()=>{let alive=true;Promise.all(records.filter(record=>!notes[record.id]).map(async record=>{try{const result=await api<{comments:{id:string;body:string;author:string;mine:boolean;createdAt?:string}[]}>(`/api/discussion?kind=record&id=${encodeURIComponent(record.id)}`);if(alive)setNotes(old=>({...old,[record.id]:result.comments}));}catch{}}));return()=>{alive=false;};},[records,notes]);
  const allNotes=Object.values(notes).flat(),total=allNotes.length,filtered=records.filter(record=>{const recordNotes=notes[record.id]??[];if(filter==='new')return recordNotes.some(note=>Date.now()-new Date(note.createdAt??record.created).getTime()<86400000);if(filter==='mine')return recordNotes.some(note=>note.mine);if(filter==='anonymous')return false;return true;});
  return <div className="space-y-5">
    <section className="space-y-1 pt-1"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1.5"><h1 className="stitch-serif text-[1.625rem] leading-[2.125rem] font-medium tracking-tight text-[#99452c]">비하인드 낙서장</h1><Icon name="draw" className="text-xl text-[#99452c]"/></div><span className="shrink-0 rounded-full bg-[#c2e9c9] px-2.5 py-1 text-[10px] font-semibold text-[#486a51] shadow-sm">오늘 도착한 비밀 낙서 {allNotes.length}개 💌</span></div><p className="text-[11px] leading-4 text-[#55433d]">사진 뒷면에 숨겨진 우리들만의 진짜 비하인드 코멘트와 롤링페이퍼</p></section>
    <div className="-mx-1 flex gap-2 overflow-x-auto py-0.5 no-scrollbar" role="group" aria-label="비하인드 필터">{([{id:'all',name:'전체 낙서',count:total},{id:'new',name:'새로운 낙서',count:allNotes.filter(note=>Date.now()-new Date(note.createdAt??0).getTime()<86400000).length},{id:'mine',name:'내 사진 뒷면',count:records.filter(record=>(notes[record.id]??[]).some(note=>note.mine)).length},{id:'anonymous',name:'익명 쪽지',count:0}] as const).map(item=><button key={item.id} type="button" aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-medium transition-colors ${filter===item.id?'bg-[#99452c] text-white shadow-[0_2px_8px_rgba(153,69,44,.25)]':'bg-[#f6e5db] text-[#30251f] hover:bg-[#f0dfd5]'}`}><span>{item.name}</span><span className={filter===item.id?'text-[#ffdbd1]':'text-[#99452c]'}>{item.count}</span>{item.id==='new'&&<span className="h-1.5 w-1.5 rounded-full bg-[#e27d60]"/>}</button>)}</div>
    <section className="space-y-3.5"><div className="flex items-center justify-between"><h2 className="stitch-serif flex items-center gap-2 text-[1.125rem] font-medium text-[#30251f]"><span className="h-2 w-2 rounded-full bg-[#99452c]"/>실시간 사진 뒷면 피드</h2><span className="text-[10px] text-[#7d562d]">방금 전 업데이트</span></div>
      {loading?<div className="rounded-xl bg-white p-8 text-center text-xs text-[#78675e]">비하인드 낙서를 불러오는 중…</div>:failed?<div className="rounded-xl bg-white p-8 text-center text-xs text-[#78675e]">비하인드 사진을 불러오지 못했어요.</div>:filtered.length?filtered.map((record,index)=><BehindFeedCard key={record.id} record={record} notes={notes[record.id]??[]} index={index} onNotes={next=>setNotes(old=>({...old,[record.id]:next}))}/>):<div className="rounded-xl bg-white p-8 text-center text-xs text-[#78675e]">{filter==='anonymous'?'아직 도착한 익명 쪽지가 없어요.':'아직 사진 뒷면에 낙서가 없어요. 첫 한마디를 남겨보세요.'}</div>}
    </section>
    <section className="space-y-3 pt-1"><div className="flex items-center justify-between gap-2"><h2 className="stitch-serif flex items-center gap-2 text-[1.125rem] font-medium text-[#30251f]"><span className="h-2 w-2 rounded-full bg-[#7d562d]"/>익명 롤링페이퍼 서랍</h2><span className="shrink-0 rounded-full bg-[#f6e5db] px-2 py-1 text-[9px] text-[#7d562d]">🔒 100% 프라이빗 비공개</span></div><div className="relative overflow-hidden rounded-2xl bg-[#fcebe0] p-4 shadow-[0_8px_24px_-4px_rgba(112,100,92,.1)]"><Icon name="local_post_office" className="pointer-events-none absolute -bottom-4 -right-3 text-[108px] text-[#99452c] opacity-[.08]"/><div className="relative z-10 space-y-3.5"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffdbd1] text-[#7b2e17] shadow-sm"><Icon name="lock" className="text-lg"/></span><div><h3 className="text-[13px] font-semibold text-[#30251f]">비밀 타임스티커 &amp; 한마디</h3><p className="text-[10px] text-[#55433d]">크루원 중 한 명에게 이름 없이 띄우는 편지</p></div></div><div className="space-y-2 rounded-xl bg-[#fff8f5] p-3 shadow-inner"><div className="flex items-center justify-between gap-2"><span className="truncate text-[9px] font-medium text-[#7d562d]">받는 사람: {groupId?'우리 크루 전체':'내 공간'}</span><span className="shrink-0 text-[9px] text-[#88726c]">익명 보장</span></div><textarea value={secret} onChange={event=>{setSecret(event.target.value);setSecretSent(false)}} maxLength={300} placeholder="다음에 같이 하고 싶은 이야기를 적어봐요…" className="min-h-[58px] w-full resize-none bg-transparent text-xs leading-5 text-[#30251f] outline-none placeholder:text-[#88726c]"/></div><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1 text-[9px] text-[#55433d]"><Icon name="schedule" className="text-sm text-[#7d562d]"/>{secretSent?'익명 쪽지를 접어 두었어요':'오늘 자정에 공개될 비밀 쪽지함'}</span><button type="button" onClick={()=>{if(secret.trim()){setSecret('');setSecretSent(true)}}} disabled={!secret.trim()} className="flex items-center gap-1.5 rounded-xl bg-[#99452c] px-3.5 py-2 text-[10px] font-semibold text-white shadow-[0_2px_8px_rgba(153,69,44,.2)] disabled:opacity-50"><Icon name="send" className="text-base"/>쪽지 접기</button></div></div></div></section>
  </div>;
}

function BehindFeedCard({record,notes,index,onNotes}:{record:BehindRecord&{album:string;folderId:string};notes:{id:string;body:string;author:string;mine:boolean;createdAt?:string}[];index:number;onNotes:(notes:{id:string;body:string;author:string;mine:boolean;createdAt?:string}[])=>void}) {
  const [draft,setDraft]=useState(''),[posting,setPosting]=useState(false),[error,setError]=useState(''),[likes,setLikes]=useState(0),[liked,setLiked]=useState(false),[liking,setLiking]=useState(false);
  useEffect(()=>{let alive=true;api<{count:number;liked:boolean}>(`/api/discussion?kind=record&id=${encodeURIComponent(record.id)}`).then(result=>{if(alive){setLikes(result.count);setLiked(result.liked)}}).catch(()=>{});return()=>{alive=false}},[record.id]);
  async function addNote(body:string){if(!body.trim()||posting)return;setPosting(true);setError('');try{await api('/api/discussion',{method:'POST',body:JSON.stringify({kind:'record',targetId:record.id,action:'comment',id:crypto.randomUUID(),body:body.trim()})});const result=await api<{comments:{id:string;body:string;author:string;mine:boolean;createdAt?:string}[]}>(`/api/discussion?kind=record&id=${encodeURIComponent(record.id)}`);onNotes(result.comments);setDraft('');}catch{setError('낙서를 남기지 못했어요. 다시 시도해 주세요.')}finally{setPosting(false)}}
  async function toggleLike(){if(liking)return;const next=!liked;setLiking(true);setError('');try{await api('/api/discussion',{method:'POST',body:JSON.stringify({kind:'record',targetId:record.id,action:'like',liked:next})});setLiked(next);setLikes(count=>Math.max(0,count+(next?1:-1)))}catch{setError('공감을 저장하지 못했어요. 다시 시도해 주세요.')}finally{setLiking(false)}}
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();await addNote(draft)}
  const photo=record.photos[0],date=new Date(record.created),tones=['bg-[#c2e9c9] text-[#486a51]','bg-[#ffdbd1] text-[#7b2e17]','bg-[#ffdcbd] text-[#623f18]'];
  return <article className="relative overflow-hidden rounded-xl bg-[#fff1e9] shadow-[0_4px_16px_-2px_rgba(112,100,92,.08),0_1px_3px_rgba(112,100,92,.04)]"><span className={`absolute -top-2 z-10 h-5 w-24 ${index%2?'right-5 rotate-3 bg-[#ffdbd1]/70':'left-1/2 -translate-x-1/2 -rotate-1 bg-[#f0bd8b]/40'} pointer-events-none rounded-sm shadow-sm`}/><div className="flex flex-col gap-4 p-4 pt-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className={`relative h-14 w-14 shrink-0 rotate-[-2deg] rounded-lg bg-white p-1 shadow-[0_2px_8px_rgba(112,100,92,.12)] ${index%2?'rotate-2':''}`}>{photo?<img src={photo.src} alt={record.title||record.album} className="h-full w-full rounded object-cover"/>:<div className="flex h-full items-center justify-center text-2xl">📷</div>}<span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f0dfd5] text-[#55433d] shadow"><Icon name="flip" className="text-xs"/></span></div><div className="min-w-0"><span className="text-[10px] font-medium text-[#7d562d]">{date.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'})} 기록의 뒷면</span><h3 className="stitch-serif mt-0.5 line-clamp-2 text-sm font-medium leading-5 text-[#30251f] md:text-base">{record.title||record.album}</h3><span className="mt-0.5 block truncate text-[10px] text-[#78675e]">{record.album}</span></div></div><Link href={`/?lang=ko&album=${record.folderId}&view=timeline`} className="flex shrink-0 items-center gap-1 rounded-lg bg-[#f6e5db]/80 px-2 py-1.5 text-[10px] text-[#55433d] hover:text-[#99452c]"><Icon name="visibility" className="text-sm"/>앞면</Link></div>
    <div className="space-y-3 rounded-lg bg-white p-3.5 shadow-inner">{notes.length?notes.slice(-3).map((note,n)=><div key={note.id}>{n>0&&<div className="mb-3 h-px w-full bg-[#fcebe0]"/>}<div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-start gap-2"><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${tones[n%tones.length]}`}>{note.mine?'나':(note.author||'?').slice(0,1)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><b className="text-[10px] font-bold text-[#30251f]">{note.mine?'나':note.author}</b><time className="text-[9px] text-[#88726c]">{note.createdAt?ago(note.createdAt):''}</time></div><p className="mt-0.5 text-xs leading-[1.45] text-[#30251f]">{note.body}</p></div></div><span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] ${n%2?'bg-[#ffdbd1] text-[#7b2e17]':'bg-[#fcebe0] text-[#7d562d]'}`}>{['🍺 우리끼리만 아는 순간','❤️ 완전 공감','📸 원본 사진'][n%3]}</span></div></div>):<p className="py-2 text-center text-xs text-[#78675e]">아직 도착한 낙서가 없어요. 첫 한마디를 남겨보세요.</p>}</div>
    <div className="flex items-center justify-between border-t border-[#efdfd5] pt-1"><div className="flex items-center gap-1.5"><button type="button" aria-pressed={liked} disabled={liking} onClick={()=>void toggleLike()} className={`rounded-full px-3 py-1.5 text-[10px] transition-colors disabled:opacity-60 ${liked?'bg-[#99452c] text-white':'bg-[#f6e5db] text-[#55433d]'}`}><Icon name="favorite" className={`mr-1 inline text-sm ${liked?'text-white':'text-[#99452c]'}`}/>공감 {likes}</button><span className="rounded-full bg-[#f6e5db] px-3 py-1.5 text-[10px] text-[#55433d]"><Icon name="sticky_note_2" className="mr-1 inline text-sm text-[#43664d]"/>낙서 {notes.length}</span></div><button type="button" onClick={()=>document.getElementById(`behind-draft-${record.id}`)?.focus()} className="flex items-center gap-1 rounded-xl bg-[#99452c] px-3.5 py-1.5 text-[10px] font-medium text-white shadow-[0_2px_8px_rgba(153,69,44,.22)]"><Icon name="edit_note" className="text-base"/>한 줄 남기기</button></div>
    {index%2===1&&<div className="pt-1"><span className="text-[10px] text-[#88726c]">빠른 리액션 스티커 붙이기</span><div className="mt-1.5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">{['🥐 빵추가','🔥 존맛','👀 팩폭','💌 비밀글'].map(sticker=><button key={sticker} type="button" disabled={posting} onClick={()=>void addNote(sticker)} className="shrink-0 rounded-full bg-[#fcebe0] px-3 py-1.5 text-[10px] text-[#55433d] hover:bg-[#f0dfd5] disabled:opacity-50">{sticker}</button>)}</div></div>}
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
            <div className="mb-5 text-center"><span className="text-3xl">✉️</span><h3 className="stitch-serif mt-2 text-xl font-semibold">사진 뒷면 롤링페이퍼</h3><p className="mt-1 text-xs text-[#7d562d]">{notes.length}개의 추억 메모</p></div>
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

function FeedCard({ item, index, owner, actions }: { item: FeedItem; index: number; owner: string | null; actions: FeedActions }) {
  const [draft, setDraft] = useState(''); const [sending, setSending] = useState(false); const [error, setError] = useState('');
  const [backside, setBackside] = useState(false); const [activePhoto, setActivePhoto] = useState(0);
  const memos = true;
  const cover = item.photos[0];
  const days = [...new Set(item.photos.map(photo => photo.day).filter((day): day is string => Boolean(day)))];
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const visiblePhotos = selectedDay ? item.photos.filter(photo => photo.day === selectedDay) : item.photos;
  const activeMedia = visiblePhotos[activePhoto] ?? visiblePhotos[0] ?? cover;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true); setError('');
    const problem = await actions.onComment(item, draft.trim());
    setSending(false);
    if (problem) setError(problem); else setDraft('');
  }
  return <article className="relative flex flex-col bg-[#ffffff] rounded-2xl shadow-[0_4px_20px_-2px_rgba(112,100,92,0.08)] p-3.5 transition-transform hover:-translate-y-0.5">
    {index % 2 === 0
      ? <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#ffdcbd]/70 backdrop-blur-xs -rotate-2 z-10 pointer-events-none"/>
      : <div className="absolute -top-2 -right-2 w-16 h-5 bg-[#c2e9c9]/80 backdrop-blur-xs rotate-12 z-10 pointer-events-none"/>}
    <div className="flex items-center justify-between pb-3 pt-1">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center stitch-sans text-[0.875rem] leading-[1.25rem] tracking-[0.01em] font-[600] shadow-inner shrink-0 ${tone(item.author)}`}>{initial(item.author)}</div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5"><span className="stitch-sans text-[0.875rem] leading-[1.25rem] tracking-[0.01em] text-[#221a14] font-bold truncate">{item.author.mine ? '나' : item.author.name}</span>{item.author.id === owner && <span className="text-[11px] text-[#7d562d] bg-[#ffdcbd]/50 px-1.5 rounded font-medium shrink-0">크루장</span>}</div>
          <span className="stitch-sans text-[0.8125rem] leading-[1.25rem] font-[400] text-[#55433d] truncate">{ago(item.createdAt)} · {item.album}</span>
        </div>
      </div>
      <Link href={detailHref(item)} aria-label="자세히 보기" className="w-8 h-8 rounded-full flex items-center justify-center text-[#55433d] hover:bg-[#fcebe0] transition-colors shrink-0"><Icon name="more_horiz" className="text-[20px]"/></Link>
    </div>
    {item.kind === 'record' && item.photoCount > 4 && <div className="rounded-xl bg-[#fff8f5] px-1 pt-1 pb-3">
      <div className="flex items-center justify-between gap-2 mb-1"><span className={`${label} text-[#7d562d] font-semibold`}>✈️ 여행 · 이벤트 묶음</span><span className={`${label} text-[#88726c]`}>{item.photoCount}장의 조각</span></div>
      <h2 className="stitch-serif text-[1.25rem] leading-snug font-semibold text-[#221a14]">{item.title || '우리의 여행 기록'}</h2>
      {item.body && <p className="stitch-sans text-[0.8125rem] leading-relaxed text-[#55433d] mt-1.5 whitespace-pre-line">{item.body}</p>}
    </div>}
    {cover && <div className={`relative w-full rounded-xl overflow-hidden bg-[#fff1e9] ${item.kind === 'record' && item.photoCount > 4 ? 'aspect-[1.4]' : index % 2 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}>
      {!backside ? <div key="front" className="memory-flip-face relative h-full w-full">
        <button type="button" onClick={() => setBackside(true)} aria-label="사진을 뒤집어 메모 보기" className="absolute inset-0 z-0 block h-full w-full text-left">
          {activeMedia?.video ? <video src={activeMedia.src} muted playsInline preload="metadata" className="w-full h-full object-cover"/> : <img alt={item.title || `${item.author.name}의 조각`} className="w-full h-full object-cover select-none" src={activeMedia?.src}/>}
        </button>
        {item.title && item.photos.length <= 1 && <div className="absolute bottom-3 left-3 bg-[#ffffff]/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md -rotate-1 max-w-[85%]"><p className="stitch-serif text-[13px] text-[#221a14] font-medium leading-tight">“{item.title}”</p></div>}
        {item.photoCount > 1 && <span className={`absolute top-3 left-3 px-2 py-0.5 bg-[#ffffff]/85 backdrop-blur-xs rounded ${label} text-[#7d562d] font-[500]`}>{activePhoto + 1} / {visiblePhotos.length}{item.photoCount > visiblePhotos.length ? ` · 전체 ${item.photoCount}장` : ''} · {item.kind === 'record' ? '모아보기' : '사진'}</span>}
        {!backside && item.photos.length > 1 && item.photoCount <= 4 && <div className="absolute bottom-2 left-2 right-2 z-20 flex gap-1.5 overflow-x-auto no-scrollbar">{visiblePhotos.map((photo, idx) => <button key={photo.id} type="button" aria-label={`사진 ${idx + 1}`} aria-pressed={activePhoto === idx} onClick={() => setActivePhoto(idx)} className={`w-10 h-10 rounded-md overflow-hidden border-2 shrink-0 ${activePhoto === idx ? 'border-white ring-1 ring-[#99452c]' : 'border-white/60 opacity-75'}`}><img src={photo.src} alt="" className="w-full h-full object-cover"/></button>)}</div>}
      </div> : <div key="back" className="memory-flip-face absolute inset-0 overflow-y-auto p-5 flex flex-col justify-center bg-[#fff9d2] text-[#492a04]">
        <div className="text-center mb-4"><span className="text-2xl">✉️</span><p className="stitch-serif text-lg font-semibold mt-1">사진 뒷면 롤링페이퍼</p><p className="text-xs text-[#7d562d] mt-1">{item.commentCount}개의 추억 메모</p></div>
        {item.body && <p className="text-sm leading-relaxed whitespace-pre-line border-y border-[#ebd876] py-3">{item.body}</p>}
        <div className="space-y-2 mt-3">{item.comments.map(c => <p key={c.id} className="text-sm leading-relaxed"><b>{c.author.mine ? '나' : c.author.name}</b> · {c.body}</p>)}
          {!item.comments.length && !item.body && <p className="text-center text-sm text-[#7d562d]">첫 메모를 남겨 추억의 뒷면을 채워보세요.</p>}
          {item.commentCount > item.comments.length && <Link href={detailHref(item)} className="block text-center text-xs text-[#7d562d] underline">메모 모두 보기</Link>}
        </div>
        <div className="flex justify-center gap-2 mt-4" aria-label="빠른 메모 스티커">{['🥐','🍺','💖','✨','🥹'].map(sticker => <button type="button" key={sticker} aria-label={`${sticker} 메모 남기기`} disabled={sending} onClick={async () => { setSending(true); setError(''); const problem = await actions.onComment(item, sticker); setSending(false); if (problem) setError(problem); }} className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-lg disabled:opacity-50">{sticker}</button>)}</div>
        {error && <p role="alert" className="text-center text-xs text-[#ba1a1a] mt-2">{error}</p>}
      </div>}
      <button type="button" onClick={() => setBackside(v => !v)} aria-label={backside ? '사진 앞면 보기' : '사진 뒷면 메모 보기'} className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2.5 py-1.5 rounded-full shadow-xs text-[#221a14]"><Icon name="flip" className="text-[15px] text-[#99452c]"/><span className={`${label} font-[500]`}>{backside ? '사진 보기' : '뒷면 메모'}</span></button>
    </div>}
    {item.kind === 'record' && item.photoCount > 4 && days.length > 1 && <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3" aria-label="여행 날짜 선택">
      {days.map((day, dayIndex) => <button key={day} type="button" aria-pressed={selectedDay === day} onClick={() => { setSelectedDay(selectedDay === day ? null : day); setActivePhoto(0); }} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${selectedDay === day ? 'bg-[#99452c] text-white' : 'bg-[#fcebe0] text-[#55433d] hover:bg-[#f6e5db]'}`}>{dayIndex + 1}일차 <span className="opacity-75">{day.slice(5).replace('-', '.')}</span></button>)}
    </div>}
    {cover && item.kind === 'record' && item.photoCount > 4 && !backside && <div className="grid grid-cols-3 gap-2 mt-2" aria-label="여행 사진 모아보기">
      {visiblePhotos.slice(1, 3).map((photo, idx) => <button key={photo.id} type="button" aria-label={`${idx + 2}번째 여행 사진`} aria-pressed={activePhoto === idx + 1} onClick={() => setActivePhoto(idx + 1)} className={`relative aspect-[1.2] overflow-hidden rounded-lg bg-[#f6e5db] ${activePhoto === idx + 1 ? 'ring-2 ring-[#99452c] ring-offset-1' : ''}`}><img src={photo.src} alt="" className="h-full w-full object-cover"/></button>)}
      <button type="button" onClick={() => actions.onOpenBundle?.(item, 'gallery')} className="relative aspect-[1.2] overflow-hidden rounded-lg bg-[#fcebe0] flex flex-col items-center justify-center text-[#7d562d]"><Icon name="photo_library" className="text-[20px]"/><span className="text-sm font-bold">+{Math.max(item.photoCount - 3, 0)}</span><span className={`${label} mt-0.5`}>전체 보기</span></button>
    </div>}
    {!cover && item.title && <p className="stitch-serif text-[1.25rem] leading-[1.75rem] font-[500] text-[#221a14]">{item.title}</p>}
    {item.body && !(item.kind === 'record' && item.photoCount > 4) && <div className="pt-3 pb-1"><p className="stitch-sans text-[0.9375rem] font-[400] text-[#221a14] leading-relaxed whitespace-pre-line">{item.body}</p></div>}
    <div className="flex items-center gap-1.5 pt-3 pb-1">
      <button type="button" aria-pressed={item.liked} onClick={() => actions.onLike(item)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors ${item.liked ? 'bg-[#ffdbd1]' : 'bg-[#fcebe0] hover:bg-[#f6e5db]'}`}><span className="text-[13px]">💖</span><span className={`${label} text-[#221a14] font-semibold`}>{item.likes}</span></button>
      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fff1e9] text-[#55433d] ${label} font-[500]`}><Icon name="edit_note" className="text-[15px]"/>{item.commentCount}</span>
    </div>
    {(memos || backside) && <div className="relative mt-3 pt-2">
      <div className="bg-[#fcebe0] p-3 rounded-xl shadow-inner space-y-2 relative">
        <div className="absolute -top-2 left-6 w-12 h-3.5 bg-[#dbc1ba]/40 rotate-2 pointer-events-none"/>
        <div className="flex items-center justify-between pb-1">
          <span className={`${label} text-[#55433d] font-bold flex items-center gap-1`}><Icon name="edit_note" className="text-[14px]"/>포스트잇 댓글 ({item.commentCount})</span>
          <span className="text-[10px] text-[#7d562d]">조각원 전용 낙서</span>
        </div>
        {item.comments.map(c => <div key={c.id} className="flex items-start gap-2 bg-[#ffffff]/80 p-2 rounded-lg">
          <div className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold ${tone(c.author)}`}>{initial(c.author)}</div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between"><span className={`${label} text-[#221a14] font-bold`}>{c.author.mine ? '나' : c.author.name}</span><span className="text-[10px] text-[#55433d]">{ago(c.createdAt)}</span></div>
            <p className="stitch-sans text-[0.8125rem] font-[400] text-[#221a14] leading-tight mt-0.5 whitespace-pre-line break-words">{c.body}</p>
          </div>
        </div>)}
        {item.commentCount > item.comments.length && <Link href={detailHref(item)} className={`block px-2 ${label} text-[#7d562d] font-[500]`}>댓글 {item.commentCount}개 모두 보기</Link>}
        <form className="flex items-center gap-2 pt-1" onSubmit={submit}>
          <input aria-label="포스트잇 댓글" value={draft} maxLength={1000} onChange={e => { setDraft(e.target.value); setError(''); }} className="flex-1 min-w-0 bg-[#ffffff] px-3 py-1.5 rounded-lg text-[0.8125rem] leading-[1.25rem] font-[400] stitch-sans text-[#221a14] placeholder:text-[#55433d]/60 focus:outline-hidden" placeholder="나도 한마디 포스트잇 남기기..." type="text"/>
          <button aria-label="메모 붙이기" disabled={sending || !draft.trim()} className="w-8 h-8 rounded-lg bg-[#bf9061] text-[#492a04] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-50" type="submit"><Icon name="send" className="text-[16px]"/></button>
        </form>
        {error && <p role="alert" className="text-[11px] text-[#ba1a1a] px-1">{error} <Link href={detailHref(item)} className="underline">앨범에서 남기기</Link></p>}
      </div>
    </div>}
    <div className="flex items-center justify-between pt-3 mt-1 text-[#55433d]">
      {item.kind === 'record' && item.photoCount > 4 ? <button type="button" onClick={() => actions.onOpenBundle?.(item, 'slideshow')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#fcebe0] transition-colors active:scale-95"><Icon name="cached" className="text-[18px] text-[#43664d]"/><span className={`${label} font-[500]`}>{item.photoCount}장 전체 슬라이드 & 뒷면 순회하기</span></button> : <Link href={detailHref(item)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#fcebe0] transition-colors active:scale-95"><Icon name="cached" className="text-[18px] text-[#43664d]"/><span className={`${label} font-[500]`}>비하인드 뒷면</span></Link>}
      <Link href={galleryHref(item)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#fcebe0] transition-colors active:scale-95"><Icon name="photo_library" className="text-[18px] text-[#7d562d]"/><span className={`${label} font-[500]`}>{item.kind === 'record' && item.photoCount > 4 ? '전체 사진 보기' : '앨범 보기'}</span></Link>
    </div>
  </article>;
}

function readGroup() { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } }
function saveGroup(id: string | null) { try { localStorage.setItem(STORAGE_KEY, id ?? 'personal'); } catch { /* Remembering the crew is a convenience. */ } }
function forgetGroup() { try { localStorage.removeItem(STORAGE_KEY); } catch { /* Remembering the crew is a convenience. */ } }

async function fetchFeed(group: string | null): Promise<FeedData> {
  const params = new URLSearchParams({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  if (group) params.set('group', group);
  try { return await api<FeedData>(`/api/feed?${params}`); }
  catch (error) {
    // A remembered crew the viewer has since left falls back to the default one.
    if (group && group !== 'personal' && error instanceof Error && error.message === 'GROUP_NOT_FOUND') { forgetGroup(); return fetchFeed(null); }
    throw error;
  }
}
const commentErrors: Record<string, string> = { TERMS_REQUIRED: '커뮤니티 규칙 동의 후 댓글을 남길 수 있어요.', RATE_LIMITED: '잠시 후 다시 남겨 주세요.', ACCOUNT_SUSPENDED: '지금은 댓글을 남길 수 없어요.' };

export default function HomeFeed() {
  const [data, setData] = useState<FeedData | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback((group: string | null) => fetchFeed(group).then(feed => { setData(feed); setFailed(false); }, () => setFailed(true)), []);
  useEffect(() => { void load(readGroup()); }, [load]);
  const actions: FeedActions = {
    onSelectGroup(id) { saveGroup(id); setData(null); void load(id ?? 'personal'); },
    onLike(item) {
      const toggle = (liked: boolean) => setData(d => d && { ...d, items: d.items.map(i => i.kind === item.kind && i.id === item.id ? { ...i, liked, likes: i.likes + (liked ? 1 : -1) } : i) });
      toggle(!item.liked);
      api('/api/discussion', { method: 'POST', body: JSON.stringify({ kind: item.kind, targetId: item.id, action: 'like', liked: !item.liked }) }).catch(() => toggle(item.liked));
    },
    async onComment(item, body) {
      try {
        await api('/api/discussion', { method: 'POST', body: JSON.stringify({ kind: item.kind, targetId: item.id, action: 'comment', id: crypto.randomUUID(), body }) });
        void load(data?.crew.id ?? 'personal');
        return null;
      } catch (error) { return commentErrors[error instanceof Error ? error.message : ''] ?? '댓글을 남기지 못했어요.'; }
    },
  };
  if (data) return <CrewFeedView data={data} actions={actions}/>;
  return <div className={`${stitchRoot} h-screen flex flex-col items-center justify-center gap-3 bg-[#fff8f5] text-[#55433d] px-6 text-center`} style={{ fontFamily: sansStack }}>
    <StitchIconFont/>
    {failed
      ? <><p className="stitch-sans text-[0.9375rem]">피드를 불러오지 못했어요.</p><div className="flex gap-2"><button type="button" onClick={() => { setFailed(false); void load(readGroup()); }} className="px-4 py-2 rounded-xl bg-[#99452c] text-[#ffffff] stitch-sans text-[0.8125rem] font-semibold">다시 시도</button><Link href="/?lang=ko&section=rooms" className="px-4 py-2 rounded-xl bg-[#fcebe0] stitch-sans text-[0.8125rem] font-semibold">앨범으로 가기</Link></div></>
      : <p role="status" className="stitch-sans text-[0.9375rem]">추억 조각을 불러오는 중…</p>}
  </div>;
}
