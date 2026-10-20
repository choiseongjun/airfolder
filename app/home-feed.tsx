"use client";
/* eslint-disable @next/next/no-img-element -- Photo URLs need the viewer's session cookie; an optimizer cannot fetch them. */
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/client-api';
import { Icon, StitchIconFont, sansStack, stitchRoot } from './stitch-kit';

// The signed-in home: the Stitch "프라이빗 크루 데일리 홈 피드" layout filled with the viewer's own crew.
// Parts of the mockup with no data behind them (online presence, voice memos, sticker counts) are left out.
type Person = { id: string; name: string; mine: boolean };
type Media = { id: string; src: string; video: boolean };
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
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const detailHref = (item: FeedItem) => item.kind === 'photo' ? `/?lang=ko&album=${item.folderId}&photo=${item.id}` : `/?lang=ko&album=${item.folderId}&view=timeline`;

export type FeedActions = { onSelectGroup: (id: string | null) => void; onLike: (item: FeedItem) => void; onComment: (item: FeedItem, body: string) => Promise<string | null> };

export function CrewFeedView({ data, actions }: { data: FeedData; actions: FeedActions }) {
  const [memos, setMemos] = useState(true);
  const [onlyToday, setOnlyToday] = useState(false);
  const [picking, setPicking] = useState(false);
  const { crew, month } = data;
  const crewHref = `/?lang=ko&section=rooms${crew.id ? `&group=${crew.id}` : ''}`;
  const remaining = Math.max(month.goal - month.count, 0);
  const percent = Math.min(Math.round(month.count / month.goal * 100), 100);
  const items = onlyToday ? data.items.filter(i => isToday(i.createdAt)) : data.items;
  const invite = crew.id && <Link href={crewHref} className="flex items-center gap-1.5 bg-[#f6e5db] hover:bg-[#f0dfd5] transition-colors px-2.5 py-1.5 rounded-full shrink-0 text-[#55433d] active:scale-95"><div className="w-6 h-6 rounded-full border-2 border-dashed border-[#88726c] flex items-center justify-center text-[#99452c]"><Icon name="person_add" className="text-[14px]"/></div><span className={`${label} font-medium`}>+ 친구 초대</span></Link>;
  return <div className={`${stitchRoot} h-screen overflow-y-auto bg-[#fff8f5] text-[#221a14] antialiased`} style={{ fontFamily: sansStack }}>
    <StitchIconFont/>
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 pt-[env(safe-area-inset-top,0px)] bg-[#fff8f5]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 px-[1.25rem] flex items-center justify-between gap-[0.25rem]">
        <div className="flex flex-col min-w-0 pr-[0.25rem]">
          <span className="stitch-serif text-[1.25rem] leading-[1.75rem] font-[500] text-[#221a14] truncate">우리 크루 조각</span>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#43664d] shrink-0"/><span className={`${label} font-[500] text-[#55433d] truncate`}>{crew.id ? `멤버 ${crew.members.length}명` : '나만 보는 공간'}</span></div>
        </div>
        <Link href="/?lang=ko&login=1" aria-label="내 계정" className="w-8 h-8 rounded-full bg-[#99452c] flex items-center justify-center ml-0.5 shrink-0 shadow-[0_2px_8px_rgba(153,69,44,0.2)]"><Icon name="person" className="text-[#ffffff] text-[18px]"/></Link>
      </div>
    </header>
    <main className="flex flex-col relative w-full max-w-md mx-auto pt-16 pb-24 bg-[#fff8f5] min-h-screen px-[1.25rem]">
      <div className="flex flex-col w-full pb-8">
        <section className="flex flex-col gap-[0.5rem] pt-[0.25rem] mb-[1rem]">
          <div className="relative flex items-center justify-between">
            <button type="button" aria-expanded={picking} onClick={() => setPicking(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fcebe0] hover:bg-[#f6e5db] transition-colors text-left group min-w-0">
              <span className="stitch-serif text-[1.25rem] leading-[1.75rem] font-[500] text-[#221a14] flex items-center gap-1 min-w-0"><span className="truncate">{crew.name ?? '내 공간'}</span><Icon name="expand_more" className="text-[18px] text-[#55433d] group-hover:translate-y-0.5 transition-transform"/></span>
            </button>
            <span className={`${label} font-[500] text-[#7d562d] bg-[#ffdcbd]/60 px-2.5 py-1 rounded-full shrink-0`}>{crew.id ? `${crew.members.length}인의 아카이브` : '나만의 아카이브'}</span>
            {picking && <div role="menu" className="absolute top-full left-0 mt-2 z-40 min-w-[12rem] bg-[#ffffff] rounded-xl shadow-[0_8px_24px_rgba(112,100,92,0.18)] p-1.5 flex flex-col">
              {[...data.groups.map(g => ({ id: g.id as string | null, name: g.name, members: g.members })), { id: null, name: '내 공간', members: 1 }].map(g =>
                <button key={g.id ?? 'personal'} role="menuitem" type="button" onClick={() => { setPicking(false); actions.onSelectGroup(g.id); }} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left hover:bg-[#fcebe0] ${g.id === crew.id ? 'bg-[#fff1e9] text-[#99452c] font-bold' : 'text-[#221a14]'}`}>
                  <span className="stitch-sans text-[0.875rem] leading-[1.25rem] truncate">{g.name}</span><span className={`${label} text-[#88726c] shrink-0`}>{g.id ? `${g.members}명` : '나만'}</span>
                </button>)}
            </div>}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {crew.members.map(m => <div key={m.id} className="flex items-center gap-1.5 bg-[#ffffff] shadow-[0_2px_8px_rgba(112,100,92,0.06)] px-2.5 py-1.5 rounded-full shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${label} ${m.mine ? 'font-bold' : 'font-[500]'} ${tone(m)}`}>{initial(m)}</div>
              <div className="flex flex-col"><span className={`${label} text-[#221a14] font-medium leading-none`}>{m.mine ? '나' : m.name}</span>{m.id === crew.ownerId && <span className="text-[9px] text-[#99452c] font-semibold leading-tight">크루장</span>}</div>
            </div>)}
            {invite}
          </div>
        </section>
        <div className="relative mb-[1.5rem] rounded-xl overflow-hidden shadow-[0_4px_16px_-2px_rgba(112,100,92,0.08)] bg-gradient-to-br from-[#fcebe0] to-[#f6e5db] p-4 flex flex-col gap-3">
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#99452c]/20 backdrop-blur-xs -rotate-1 rounded-xs pointer-events-none"/>
          <div className="flex items-start justify-between gap-2 mt-1">
            <div className="flex items-center gap-1.5"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#e27d60] text-[#ffffff]"><Icon name="auto_awesome" className="text-[14px]"/></span><span className="stitch-sans text-[0.875rem] leading-[1.25rem] text-[#221a14] font-bold tracking-tight">{crew.id ? '크루 공동 조각 게이지' : '이번 달 나의 조각'}</span></div>
            <span className={`${label} text-[#99452c] bg-[#ffb5a0]/40 px-2.5 py-0.5 rounded-full font-bold shrink-0`}>{month.count} / {month.goal}개 달성 ({percent}%)</span>
          </div>
          <div className="space-y-1.5">
            <p className="stitch-serif text-[1.25rem] font-[500] text-[#221a14] leading-snug">{remaining ? `“이번 달 ${crew.id ? '크루 ' : ''}조각 완성까지 ${remaining}장 남음! 🥐”` : `“이번 달 조각 ${month.count}장 완성! 🎉”`}</p>
            <p className="stitch-sans text-[0.8125rem] leading-[1.25rem] font-[400] text-[#55433d]">단톡방 대신 부담 없이 사진 올리고 낙서 남기기! 우리끼리 모으는 이달의 디지털 조각들 ✨</p>
            <div className="w-full bg-[#ffffff]/80 h-2.5 rounded-full overflow-hidden p-0.5 shadow-inner mt-1"><div className="bg-[#99452c] h-full rounded-full transition-all" style={{ width: `${percent}%` }}/></div>
          </div>
          <div className="flex items-center justify-between pt-1 gap-2">
            <div className="flex items-center -space-x-1.5 min-w-0">
              {month.contributors.slice(0, 4).map(p => <div key={p.id} className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center shadow-xs ${p.mine ? 'font-bold' : ''} ${tone(p)}`}>{initial(p)}</div>)}
              <span className={`${label} font-[500] text-[#55433d] ${month.contributors.length ? 'pl-3' : ''} truncate`}>{month.contributors.length ? `이번 달 ${month.contributors.length}명 기여 중` : '아직 이번 달 조각이 없어요'}</span>
            </div>
            <Link href={crewHref} className={`flex items-center gap-1.5 bg-[#99452c] hover:bg-[#7b2e17] text-[#ffffff] px-3.5 py-1.5 rounded-xl ${label} font-[500] shadow-[0_2px_8px_rgba(153,69,44,0.25)] active:scale-95 transition-all shrink-0`}><Icon name="photo_camera" className="text-[16px]"/><span>합산 조각 보태기</span></Link>
          </div>
        </div>
        <section className="flex items-center justify-between gap-2 mb-[1rem]">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[{ today: false, text: '전체 피드' }, { today: true, text: `오늘의 조각 (${month.today})` }].map(f => <button key={f.text} type="button" aria-pressed={onlyToday === f.today} onClick={() => setOnlyToday(f.today)} className={`px-3 py-1.5 rounded-full ${label} shrink-0 transition-colors ${onlyToday === f.today ? 'bg-[#99452c] text-[#ffffff] font-semibold shadow-xs' : 'bg-[#fcebe0] hover:bg-[#f6e5db] text-[#55433d] font-[500]'}`}>{f.text}</button>)}
            {invite}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-[#fff1e9] px-2 py-1 rounded-full">
            <label className="relative inline-flex items-center cursor-pointer">
              <input checked={memos} onChange={e => setMemos(e.target.checked)} className="sr-only peer" type="checkbox"/>
              <div className="w-8 h-4 bg-[#e7d7cd] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#e27d60] after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-[#c2e9c9]"/>
              <span className={`ml-1.5 ${label} font-[500] text-[#55433d] select-none`}>{memos ? '메모 켜짐 💬' : '메모 꺼짐'}</span>
            </label>
          </div>
        </section>
        <div className="flex flex-col gap-[2.25rem]">
          {items.map((item, index) => <FeedCard key={item.kind + item.id} item={item} index={index} owner={crew.ownerId} memos={memos} actions={actions}/>)}
          {!items.length && <div className="flex flex-col items-center text-center gap-2 bg-[#ffffff] rounded-2xl shadow-[0_4px_20px_-2px_rgba(112,100,92,0.08)] px-5 py-10">
            <Icon name="photo_library" className="text-[32px] text-[#bf9061]"/>
            <p className="stitch-serif text-[1.25rem] leading-[1.75rem] font-[500]">{onlyToday ? '오늘 올라온 조각이 아직 없어요' : '아직 올라온 조각이 없어요'}</p>
            <p className="stitch-sans text-[0.8125rem] leading-[1.25rem] text-[#55433d]">첫 사진을 올리면 {crew.id ? '크루 모두의' : '나만의'} 피드가 시작돼요.</p>
          </div>}
        </div>
        <div className="sticky bottom-3 mt-6 z-30 self-center w-full max-w-sm px-2">
          <Link href={crewHref} className="w-full flex items-center justify-center gap-2 bg-[#99452c] hover:bg-[#7b2e17] text-[#ffffff] py-3 px-5 rounded-2xl shadow-[0_8px_24px_rgba(153,69,44,0.35)] active:scale-98 transition-all group">
            <Icon name="add_circle" className="text-[20px] transition-transform group-hover:rotate-90"/>
            <span className="stitch-sans text-[0.875rem] leading-[1.25rem] font-[600] tracking-wide">+ 오늘 내 조각 남기기</span>
            {remaining > 0 && <span className="ml-1 text-[11px] bg-[#ffffff]/20 px-2 py-0.5 rounded-full stitch-system">{remaining}장 남음</span>}
          </Link>
        </div>
      </div>
    </main>
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 pb-[env(safe-area-inset-bottom,0px)] bg-[#fff8f5]/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(112,100,92,0.06)]">
      <div className="h-16 px-[0.875rem] flex items-center justify-around">
        {[{ href: '/', icon: 'cottage', text: '홈 피드', current: true }, { href: crewHref, icon: 'photo_library', text: '크루 사진함' }, { href: '/?lang=ko&login=1', icon: 'settings', text: '설정' }].map(tab =>
          <Link key={tab.text} href={tab.href} aria-current={tab.current ? 'page' : undefined} className={`flex flex-col items-center justify-center w-14 h-12 transition-colors ${tab.current ? 'text-[#99452c] font-bold' : 'text-[#55433d] hover:text-[#221a14]'}`}><Icon name={tab.icon} className="text-[22px]"/><span className={`${label} font-[500] mt-0.5`}>{tab.text}</span></Link>)}
      </div>
    </nav>
  </div>;
}

function FeedCard({ item, index, owner, memos, actions }: { item: FeedItem; index: number; owner: string | null; memos: boolean; actions: FeedActions }) {
  const [draft, setDraft] = useState(''); const [sending, setSending] = useState(false); const [error, setError] = useState('');
  const cover = item.photos[0];
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
    {cover && <Link href={detailHref(item)} className={`relative block w-full rounded-xl overflow-hidden bg-[#f6e5db] ${index % 2 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}>
      {cover.video ? <video src={cover.src} muted playsInline preload="metadata" className="w-full h-full object-cover"/> : <img alt={item.title || `${item.author.name}의 조각`} className="w-full h-full object-cover select-none" src={cover.src}/>}
      {item.title && <div className="absolute bottom-3 left-3 bg-[#ffffff]/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md -rotate-1 max-w-[85%]"><p className="stitch-serif text-[13px] text-[#221a14] font-medium leading-tight">“{item.title}”</p></div>}
      <span className="absolute top-3 right-3 flex items-center gap-1 bg-[#ffffff]/90 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs text-[#221a14]"><Icon name="flip" className="text-[15px] text-[#99452c]"/><span className={`${label} font-[500]`}>뒷면 메모</span></span>
      {item.photoCount > 1 && <span className={`absolute bottom-3 right-3 px-2 py-0.5 bg-[#ffffff]/80 backdrop-blur-xs rounded ${label} text-[#7d562d] font-[500]`}>+{item.photoCount - 1}장</span>}
    </Link>}
    {!cover && item.title && <p className="stitch-serif text-[1.25rem] leading-[1.75rem] font-[500] text-[#221a14]">{item.title}</p>}
    {item.body && <div className="pt-3 pb-1"><p className="stitch-sans text-[0.9375rem] font-[400] text-[#221a14] leading-relaxed whitespace-pre-line">{item.body}</p></div>}
    <div className="flex items-center gap-1.5 pt-3 pb-1">
      <button type="button" aria-pressed={item.liked} onClick={() => actions.onLike(item)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors ${item.liked ? 'bg-[#ffdbd1]' : 'bg-[#fcebe0] hover:bg-[#f6e5db]'}`}><span className="text-[13px]">💖</span><span className={`${label} text-[#221a14] font-semibold`}>{item.likes}</span></button>
      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fff1e9] text-[#55433d] ${label} font-[500]`}><Icon name="edit_note" className="text-[15px]"/>{item.commentCount}</span>
    </div>
    {memos && <div className="relative mt-3 pt-2">
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
      <Link href={detailHref(item)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#fcebe0] transition-colors active:scale-95"><Icon name="cached" className="text-[18px] text-[#43664d]"/><span className={`${label} font-[500]`}>비하인드 뒷면</span></Link>
      <Link href={`/?lang=ko&album=${item.folderId}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#fcebe0] transition-colors active:scale-95"><Icon name="photo_library" className="text-[18px] text-[#7d562d]"/><span className={`${label} font-[500]`}>앨범 보기</span></Link>
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
