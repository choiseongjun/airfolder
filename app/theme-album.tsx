'use client';
/* eslint-disable @next/next/no-img-element -- Swatch thumbnails reuse the album's already-loaded photo URLs. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Hourglass, Music2, Palette, Share2, Sticker as StickerIcon, Ticket, Wand2 } from 'lucide-react';
import { api } from '@/lib/client-api';
import { browseTheme } from '@/lib/browse-data';
import type { MemoryItem } from './memories';
import MediaView from './media-view';
import AlbumShare from './album-share';
import { AlbumRewardCover } from './reward-decoration';
import './theme-album.css';
import './theme-layouts.css';
import './theme-concepts.css';

// The three "killer" concepts (real interaction/motion you won't find in a sticker-dakku app:
// tear the pass, watch it print, the record actually spins) lead the picker. The rest follow,
// roughly by how distinctive their layout is, not just a recolour of the same card.
export const albumThemes = [
 { id: 'ticket', ko: '보딩패스', en: 'Boarding Pass', hintKo: '탑승권을 뜯으면 열리는 여행 앨범', hintEn: 'Tear the pass to open the trip', kicker: 'BOARDING PASS', chapter: 'GATE', layout: 'ticket' },
 { id: 'receipt', ko: '추억 영수증', en: 'Memory Receipt', hintKo: '감열지 영수증으로 지이잉 출력', hintEn: 'Printed out like a thermal receipt', kicker: 'MEMONESTIA PHOTO LAB', chapter: 'ITEM', layout: 'receipt' },
 { id: 'vinyl', ko: 'LP 플레이어', en: 'Vinyl Player', hintKo: '돌아가는 LP와 그날의 노래', hintEn: 'A spinning record and the song of the day', kicker: 'SIDE A', chapter: 'TRACK', layout: 'vinyl' },
 { id: 'polaroid', ko: '폴라로이드 썸머', en: 'Polaroid Summer', hintKo: '파란 바다, 마스킹테이프, 손글씨', hintEn: 'Blue sea, washi tape, handwriting', kicker: 'SUMMER DIARY', chapter: 'DAY', layout: 'classic' },
 { id: 'birthday', ko: '버스데이 필름', en: 'Birthday Film', hintKo: '가랜드, 컨페티, 케이크', hintEn: 'Garland, confetti & cake', kicker: 'HAPPY BIRTHDAY', chapter: 'PART', layout: 'classic' },
 { id: 'fourcut', ko: '인생네컷', en: 'Photo Booth', hintKo: '네 컷 스트립으로 착착', hintEn: 'Stacked four-cut strips', kicker: 'PHOTO BOOTH', chapter: 'TAKE', layout: 'strip' },
 { id: 'film', ko: '필름 아카이브', en: 'Film Archive', hintKo: '필름 프레임과 주황 날짜 도장', hintEn: 'Film frames & orange date stamps', kicker: 'ROLL 01 · 36 EXP', chapter: 'FRAME', layout: 'classic' },
 { id: 'magazine', ko: '매거진', en: 'Magazine', hintKo: '큰 화보 사진과 기사 구성', hintEn: 'Cover shots and feature spreads', kicker: 'ISSUE NO. 01', chapter: 'FEATURE', layout: 'magazine' },
 { id: 'starry', ko: '별밤 콘서트', en: 'Starry Night', hintKo: '밤하늘, 별빛, 네온 테두리', hintEn: 'Night sky, starlight & neon', kicker: 'NIGHT OUT', chapter: 'TRACK', layout: 'classic' },
 { id: 'scrap', ko: '크래프트 스크랩', en: 'Kraft Scrapbook', hintKo: '겹쳐 붙인 사진과 찢은 메모지', hintEn: 'Overlapped prints & torn notes', kicker: 'SCRAPBOOK', chapter: 'NO.', layout: 'collage' },
 { id: 'stamp', ko: '우표 컬렉션', en: 'Stamp Collection', hintKo: '톱니 테두리와 날짜 소인', hintEn: 'Perforated edges & postmarks', kicker: 'AIR MAIL', chapter: 'SET', layout: 'stamp' },
 { id: 'softgirl', ko: '소프트 걸', en: 'Soft Girl', hintKo: '핑크 깅엄, 리본, 하트', hintEn: 'Pink gingham, ribbons & hearts', kicker: 'xoxo, us', chapter: '♡', layout: 'classic' },
 { id: 'picnic', ko: '피크닉 데이', en: 'Picnic Day', hintKo: '체크 돗자리, 체리, 데이지', hintEn: 'Gingham blanket, cherries & daisies', kicker: 'PICNIC CLUB', chapter: 'SPOT', layout: 'classic' },
 { id: 'diary', ko: '다이어리 노트', en: 'Diary Notebook', hintKo: '줄노트에 붙이고 옆에 메모', hintEn: 'Taped on lined paper, notes in the margin', kicker: 'MY DIARY', chapter: 'PAGE', layout: 'notebook' },
] as const;
export type AlbumThemeId = typeof albumThemes[number]['id'];

export type StickerKind = 'sun' | 'wave' | 'star' | 'heart' | 'bow' | 'sparkle' | 'cake' | 'balloon' | 'flower' | 'cherry' | 'moon';
type Decor = StickerKind | { text: string };
const decor: Record<AlbumThemeId, Decor[]> = {
 polaroid: ['sun', { text: 'summer!' }, 'wave', 'star', { text: 'best day ever' }, 'flower'],
 film: [{ text: 'MEMO 400' }, 'sparkle', { text: '★ keep' }, 'star', { text: 'NO. 07' }, 'sparkle'],
 softgirl: ['heart', 'sparkle', { text: 'xoxo' }, 'bow', 'flower', { text: 'so cute' }],
 birthday: ['cake', 'balloon', { text: 'HBD!' }, 'star', { text: 'make a wish' }, 'heart'],
 picnic: ['cherry', 'flower', { text: 'picnic day' }, 'sun', { text: 'yum!' }, 'cherry'],
 starry: ['moon', 'sparkle', { text: 'encore!' }, 'star', { text: 'best night' }, 'sparkle'],
 diary: ['flower', { text: 'today' }, 'heart', 'star', { text: 'note to self' }, 'sun'],
 fourcut: [{ text: 'SMILE!' }, 'star', { text: '1, 2, 3!' }, 'heart', { text: 'cheese' }, 'sparkle'],
 ticket: [{ text: 'ADMIT ONE' }, 'sun', { text: 'GATE 07' }, 'star', { text: 'BON VOYAGE' }, 'wave'],
 magazine: [{ text: 'EXCLUSIVE' }, { text: 'NEW' }, { text: 'P. 12' }, 'star', { text: 'COVER STORY' }, 'sparkle'],
 stamp: [{ text: 'FIRST CLASS' }, 'flower', { text: 'POSTMARKED' }, 'star', { text: 'PAR AVION' }, 'heart'],
 scrap: ['flower', { text: 'keep this' }, 'heart', { text: 'memories' }, 'star', 'sun'],
 receipt: [{ text: 'PAID' }, { text: 'NO REFUND' }, { text: 'THANK YOU' }, { text: 'COPY' }, { text: '*** 1 ***' }, { text: 'KEEP' }],
 vinyl: [{ text: 'SIDE A' }, 'star', { text: '33⅓ RPM' }, 'sparkle', { text: 'B-SIDE' }, 'heart'],
};

export function Sticker({ kind }: { kind: StickerKind }) {
 const art: Record<StickerKind, React.ReactNode> = {
  sun: <><circle cx="32" cy="32" r="13" fill="#ffd25e" stroke="#f29b38" strokeWidth="3"/>{Array.from({ length: 8 }, (_, i) => <path key={i} d="M32 6v9" stroke="#f29b38" strokeWidth="4" strokeLinecap="round" transform={`rotate(${i * 45} 32 32)`}/>)}</>,
  wave: <path d="M4 38c7-9 14-9 21 0s14 9 21 0 11-8 14-4M4 50c7-9 14-9 21 0s14 9 21 0 11-8 14-4" fill="none" stroke="#4aa3d8" strokeWidth="5" strokeLinecap="round"/>,
  star: <path d="M32 5l7.6 16.3 17.9 2.1-13.2 12.2 3.5 17.7L32 44.5l-15.8 8.8 3.5-17.7L6.5 23.4l17.9-2.1z" fill="#ffd25e" stroke="#e9a23b" strokeWidth="3" strokeLinejoin="round"/>,
  heart: <path d="M32 54S8 40 8 23a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 17-24 31-24 31z" fill="#ff8fb1" stroke="#e5577f" strokeWidth="3" strokeLinejoin="round"/>,
  bow: <><path d="M32 30C22 14 6 16 8 28s16 10 24 2zM32 30c10-16 26-14 24-2s-16 10-24 2z" fill="#ffb3c8" stroke="#e46d93" strokeWidth="3" strokeLinejoin="round"/><path d="M29 33l-9 22M35 33l9 22" stroke="#e46d93" strokeWidth="5" strokeLinecap="round"/><circle cx="32" cy="30" r="5" fill="#ff8fb1" stroke="#e46d93" strokeWidth="3"/></>,
  sparkle: <path d="M32 4c3 16 8 21 24 28-16 7-21 12-24 28-3-16-8-21-24-28 16-7 21-12 24-28z" fill="#fff4c9" stroke="#e1b552" strokeWidth="3" strokeLinejoin="round"/>,
  cake: <><rect x="12" y="32" width="40" height="22" rx="5" fill="#ffd9e4" stroke="#e46d93" strokeWidth="3"/><path d="M12 40c5 4 9 4 13 0s9-4 14 0 9 4 13 0" fill="none" stroke="#fff" strokeWidth="4"/><path d="M24 31V20M32 31V18M40 31V20" stroke="#7cc4e8" strokeWidth="4" strokeLinecap="round"/><path d="M24 15c-2-3 2-6 0-8 4 2 3 6 0 8zM32 13c-2-3 2-6 0-8 4 2 3 6 0 8zM40 15c-2-3 2-6 0-8 4 2 3 6 0 8z" fill="#ffb02e"/></>,
  balloon: <><ellipse cx="32" cy="24" rx="15" ry="18" fill="#8fd0ff" stroke="#3d93cf" strokeWidth="3"/><path d="M29 42h6l-3 4z" fill="#3d93cf"/><path d="M32 46c-5 6 5 9 0 15" fill="none" stroke="#7a7a7a" strokeWidth="2"/><ellipse cx="26" cy="17" rx="3" ry="5" fill="#fff" opacity=".7"/></>,
  cherry: <><path d="M22 40c4-14 10-24 22-30M42 40c-2-12-1-22 2-30" fill="none" stroke="#5a9b4a" strokeWidth="3" strokeLinecap="round"/><path d="M44 10c6-4 13-2 15 3-6 3-12 2-15-3z" fill="#7fc36a" stroke="#5a9b4a" strokeWidth="2"/><circle cx="21" cy="45" r="11" fill="#ff5a6e" stroke="#c9364b" strokeWidth="3"/><circle cx="43" cy="45" r="11" fill="#ff5a6e" stroke="#c9364b" strokeWidth="3"/><ellipse cx="17" cy="41" rx="3" ry="4" fill="#fff" opacity=".7"/><ellipse cx="39" cy="41" rx="3" ry="4" fill="#fff" opacity=".7"/></>,
  moon: <><path d="M40 8a24 24 0 1 0 16 38A20 20 0 0 1 40 8z" fill="#ffe08a" stroke="#e9b43b" strokeWidth="3" strokeLinejoin="round"/><circle cx="30" cy="30" r="3" fill="#f2c95a"/><circle cx="24" cy="42" r="2" fill="#f2c95a"/></>,
  flower: <>{Array.from({ length: 5 }, (_, i) => <ellipse key={i} cx="32" cy="17" rx="8" ry="12" fill="#fff" stroke="#f0a1b8" strokeWidth="3" transform={`rotate(${i * 72} 32 32)`}/>)}<circle cx="32" cy="32" r="7" fill="#ffd25e" stroke="#e9a23b" strokeWidth="3"/></>,
 };
 return <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">{art[kind]}</svg>;
}
function Deco({ item, className }: { item: Decor; className: string }) {
 return typeof item === 'string' ? <span className={`ta-sticker ${className}`} aria-hidden="true"><Sticker kind={item}/></span> : <span className={`ta-sticker ta-sticker-text ${className}`} aria-hidden="true">{item.text}</span>;
}

type Chapter = { id: string; note: string; day: string; photos: MemoryItem[] };
const fileLike = /(^(img|dsc|pxl|kakaotalk)[_-])|\.(jpe?g|png|heic|webp|gif|mp4|mov)$/i;
const isTheme = (id: unknown): id is AlbumThemeId => albumThemes.some(t => t.id === id);
export function savedTheme(folderId: string, birthday: boolean, albumTheme = ''): AlbumThemeId {
 const fallback = isTheme(albumTheme) ? albumTheme : birthday ? 'birthday' : (browseTheme(folderId) as AlbumThemeId | undefined) || 'polaroid';
 try { const saved = localStorage.getItem('memonestia-album-theme:' + folderId); return isTheme(saved) ? saved : fallback; } catch { return fallback; }
}
const dotted = (day: string) => day.replaceAll('-', '.');
const stamp = (day: string) => `'${day.slice(2, 4)} ${day.slice(5, 7)} ${day.slice(8, 10)}`;

const clock = (ms?: number) => ms ? new Date(ms).toTimeString().slice(0, 5) : '--:--';
const songSearch = (song: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(song)}`;
function nextSundayNine() {
 const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); d.setHours(21, 0, 0, 0);
 return d;
}
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
function countdownText(ms: number, ko: boolean) {
 const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), hms = [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');
 return d ? (ko ? `${d}일 ${hms}` : `${d}d ${hms}`) : hms;
}
export type AlbumStyle = { theme: string; song: string; revealAt: string; held: number; heldPeople: number };

function dDay(day: string) {
 const now = new Date(), left = Math.round((Date.parse(day + 'T00:00:00Z') - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
 return left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : '';
}

export function albumShareMessage(title: string, url: string, ko: boolean, birthday: boolean, own = true) {
 if (!own) return ko ? `📸 우리 ${title} 앨범, 이렇게 자동으로 꾸며졌어!\n사진이랑 한마디만 넣으면 돼. 너도 만들어 봐 →\n${url}` : `📸 Our ${title} album decorated itself!\nJust add photos and a note. Make yours →\n${url}`;
 if (birthday) return ko ? `🎂 ${title} 앨범이에요!\n같이 찍은 사진 한 장이랑 한마디 남겨줘. 생일날 한 권으로 보여줄 거야 🤫\n${url}` : `🎂 ${title} album!\nAdd a photo and a short note. We'll show it on the big day 🤫\n${url}`;
 return ko ? `📸 ${title} 앨범 같이 보자!\n열면 꾸민 앨범이 바로 보이고, 내 사진도 한 장씩 보탤 수 있어.\n${url}` : `📸 Let's look at our ${title} album!\nIt opens decorated, and you can add your own photos too.\n${url}`;
}

/** `birthday` is the party date (or '' when unknown) for birthday albums; undefined otherwise. */
/** `localItems` renders photos that are not uploaded yet (a live preview), skipping the server and sharing. */
/** `style` is what the owner saved for everyone; `owner` may change it. `onChanged` reloads the workspace after a capsule opens. */
export default function ThemeAlbum({ folderId, title, description, locale, browsing, birthday, canShare, onPhoto, localItems, style, owner, onChanged }: { folderId: string; title: string; description: string; locale: 'ko' | 'en'; browsing: boolean; birthday?: string; canShare?: boolean; onPhoto: (item: MemoryItem) => void; localItems?: MemoryItem[]; style?: AlbumStyle; owner?: boolean; onChanged?: () => void }) {
 const ko = locale === 'ko';
 // Owners share the album's invite link (it opens on this decorated view); members share the finished look.
 const [sharing, setSharing] = useState<'' | 'share' | 'nudge'>(''), shareable = !browsing && !localItems;
 const share = () => setSharing('share');
 const [members, setMembers] = useState<{ id: string; name: string; mine: boolean }[]>([]);
 useEffect(() => {
  if (!canShare) return;
  let active = true;
  api<{ members: { id: string; name: string; mine: boolean }[] }>(`/api/members?folderId=${encodeURIComponent(folderId)}`).then(r => { if (active) setMembers(r.members); }).catch(() => {});
  return () => { active = false; };
 }, [canShare, folderId]);
 const [month, setMonth] = useState('all');
 const [fetched, setItems] = useState<MemoryItem[] | null>(null), [error, setError] = useState(false), [retry, setRetry] = useState(0);
 const [theme, setTheme] = useState<AlbumThemeId>(() => savedTheme(folderId, birthday !== undefined, style?.theme));
 const [themePickerOpen, setThemePickerOpen] = useState(false);
 const [studioOpen, setStudioOpen] = useState(false);
 const themeRowRef = useRef<HTMLDivElement>(null);
 const editable = !!owner && !browsing && !localItems;
 const [song, setSong] = useState(style?.song || ''), [songDraft, setSongDraft] = useState<string | null>(null);
 const [revealAt, setRevealAt] = useState(style?.revealAt || ''), [capsuleDraft, setCapsuleDraft] = useState(''), [styleError, setStyleError] = useState('');
 const [now, setNow] = useState(() => Date.now()), [torn, setTorn] = useState(false), [slide, setSlide] = useState(0);
 const locked = !!revealAt && Date.parse(revealAt) > now;
 useEffect(() => {
  if (!locked) return;
  const timer = window.setInterval(() => {
   const t = Date.now(); setNow(t);
   // The moment a capsule opens, reload so everyone's held photos appear at once.
   if (t >= Date.parse(revealAt)) { setRetry(n => n + 1); onChanged?.(); }
  }, 1000);
  return () => window.clearInterval(timer);
 }, [locked, revealAt, onChanged]);
 async function saveStyle(change: { theme?: string; song?: string; revealAt?: string }) {
  setStyleError('');
  try { await api('/api/folders', { method: 'PUT', body: JSON.stringify({ action: 'style', id: folderId, ...change }) }); return true; }
  catch { setStyleError(ko ? '저장하지 못했어요. 잠시 후 다시 해 주세요.' : 'Could not save. Try again in a moment.'); return false; }
 }
 const items = localItems || fetched;
 useEffect(() => {
  if (localItems) return;
  const controller = new AbortController();
  (async () => {
   try {
    const all: MemoryItem[] = []; let more = true;
    while (more) { const data = await api<{ items: MemoryItem[]; hasMore: boolean }>(`/api/memories?folderId=${folderId}&offset=${all.length}&timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { signal: controller.signal }); all.push(...data.items); more = data.hasMore; }
    if (!controller.signal.aborted) {
     // Offset pagination may overlap while records are being added. Collapse
     // repeated rows before building the keyed chapter/photo lists.
     const unique = new Map<string, MemoryItem>();
     for (const item of all) unique.set(`${item.kind}:${item.id}`, item);
     setItems([...unique.values()].reverse()); setError(false);
    }
   } catch { if (!controller.signal.aborted) setError(true); }
  })();
  return () => controller.abort();
 }, [folderId, retry, localItems]);

 const chapters = useMemo(() => {
  const list: Chapter[] = [];
  for (const item of items || []) {
   const photos = (item.kind === 'photo' ? [item] : item.photos || []).filter(p => p.src);
   const note = item.kind === 'record' ? (item.body || item.title || '').trim() : '';
   const last = list[list.length - 1];
   // Loose photos from the same day read better as one spread than as many one-photo chapters.
   if (!note && last && !last.note && last.day === item.day) last.photos.push(...photos);
   else if (note || photos.length) list.push({ id: item.id, note, day: item.day, photos });
  }
  return list;
 }, [items]);
 // Ongoing albums read best a month at a time: "this month of us".
 const months = [...new Set(chapters.map(c => c.day.slice(0, 7)).filter(m => /^\d{4}-\d{2}$/.test(m)))].sort().reverse();
 const monthly = birthday === undefined && !localItems && months.length > 0;
 const shown = monthly && month !== 'all' ? chapters.filter(c => c.day.startsWith(month)) : chapters;
 const thisMonth = new Date().toISOString().slice(0, 7);
 const monthName = (m: string) => ko ? `${Number(m.slice(5))}월` : new Date(m + '-01T12:00:00').toLocaleString('en', { month: 'long' });
 const monthTitle = (m: string) => ko ? `${monthName(m)}의 우리` : `Us in ${monthName(m)}`;
 const allPhotos = shown.flatMap(c => c.photos);
 const people = [...new Set(allPhotos.map(p => p.author).filter(Boolean))];
 // Who joined but hasn't added anything yet, so the organiser can give them a friendly nudge.
 const contributors = new Set(chapters.flatMap(c => c.photos.map(p => p.author)).filter(Boolean));
 const pending = members.filter(m => !m.mine && !contributors.has(m.name));
 const named = pending.filter(m => !/^Member [0-9a-f]{6}$/.test(m.name)).map(m => m.name);
 function nudgeMessage(url: string, countdown: string) {
  const who = named.length ? named.slice(0, 3).join(', ') + (pending.length > 3 ? (ko ? ` 외 ${pending.length - 3}명` : ` and ${pending.length - 3} more`) : '') : (ko ? `아직 안 올린 ${pending.length}명` : `the ${pending.length} of you who haven't`);
  return ko ? `⏰ ${title}${countdown ? ` ${countdown}` : ''}!
${who}, 아직 사진 안 올렸지? 한 장이랑 한마디만 남겨줘 🙏
${url}` : `⏰ ${title}${countdown ? ` ${countdown}` : ''}!
${who}, add one photo and a note? 🙏
${url}`;
 }
 // The closing shot (often the group selfie) makes the best cover and avoids repeating the first print.
 const cover = allPhotos.findLast(p => p.mediaType !== 'video') || allPhotos[0];
 const meta = albumThemes.find(t => t.id === theme)!;
 const day = birthday || shown[0]?.day || '';

 const stills = allPhotos.filter(p => p.mediaType !== 'video' && p.src);
 useEffect(() => {
  if (theme !== 'vinyl' || stills.length < 2) return;
  const timer = window.setInterval(() => setSlide(n => n + 1), 3200);
  return () => window.clearInterval(timer);
 }, [theme, stills.length]);
 async function saveSong() {
  const next = (songDraft || '').trim().slice(0, 80);
  if (await saveStyle({ song: next })) { setSong(next); setSongDraft(null); }
 }
 async function lockCapsule() {
  const at = new Date(capsuleDraft || localInput(nextSundayNine()));
  if (await saveStyle({ revealAt: at.toISOString() })) { setRevealAt(at.toISOString()); setNow(Date.now()); setCapsuleDraft(''); }
 }
 async function openCapsule() {
  if (await saveStyle({ revealAt: 'now' })) { setRevealAt(new Date().toISOString()); setNow(Date.now()); setRetry(n => n + 1); onChanged?.(); }
 }
 function tear(e: React.PointerEvent<HTMLButtonElement>) {
  // Drag the stub sideways (or just tap it) to tear the pass and board.
  const el = e.currentTarget, start = e.clientX;
  el.setPointerCapture(e.pointerId);
  const move = (ev: PointerEvent) => { const dx = Math.max(0, ev.clientX - start); el.style.transform = `translateX(${dx}px) rotate(${dx / 12}deg)`; };
  const up = (ev: PointerEvent) => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); const dx = ev.clientX - start; el.style.transform = ''; if (dx > 60 || Math.abs(dx) < 6) board(el); };
  el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
 }
 function board(el?: HTMLElement | null) {
  el?.closest('.ta-gate')?.classList.add('is-torn');
  window.setTimeout(() => setTorn(true), 520);
 }

 function choose(id: AlbumThemeId) {
  setTheme(id);
  try { localStorage.setItem('memonestia-album-theme:' + folderId, id); } catch {}
  setTorn(false);
  if (editable) void saveStyle({ theme: id });
 }
 function photo(p: MemoryItem, index: number, size: 'big' | 'small', bare = false) {
  const caption = !bare && p.body && !fileLike.test(p.body.trim()) ? p.body : '';
  return <figure key={p.id} className={`ta-photo ta-${size}`} style={{ '--i': index } as React.CSSProperties}>
   <button onClick={() => onPhoto(p)} aria-label={ko ? `${caption || title} 크게 보기` : `Open ${caption || title}`}>
    <span className="ta-frame"><MediaView src={p.src!} name={caption || title} mediaType={p.mediaType}/>{theme === 'film' && p.day && <span className="ta-date-stamp" aria-hidden="true">{stamp(p.day)}</span>}</span>
   </button>
   {caption && <figcaption><span className="ta-caption">{caption}</span></figcaption>}
  </figure>;
 }
 const captionOf = (p: MemoryItem) => p.body && !fileLike.test(p.body.trim()) ? p.body : '';
 function spread(chapter: Chapter, ci: number) {
  const ps = chapter.photos, no = (i: number) => `${String(ci + 1).padStart(2, '0')}${String(i + 1).padStart(2, '0')}`;
  switch (meta.layout) {
   case 'notebook': return ps.map((p, i) => <div key={p.id} className={`ta-row ta-row-one ta-nb-row${i % 2 ? ' is-flip' : ''}`}>{photo(p, i, 'big')}</div>);
   case 'strip': {
    const strips: MemoryItem[][] = []; for (let i = 0; i < ps.length; i += 4) strips.push(ps.slice(i, i + 4));
    return <div className="ta-strips">{strips.map((strip, si) => <div key={si} className="ta-strip">{strip.map((p, i) => photo(p, si * 4 + i, 'small', true))}<span className="ta-strip-foot">memonestia · {dotted(strip[0].day || chapter.day)}</span></div>)}</div>;
   }
   case 'ticket': return <div className="ta-tickets">{ps.map((p, i) => <article key={p.id} className="ta-ticket">{photo(p, i, 'small', true)}<div className="ta-ticket-stub"><small>{ko ? '탑승자' : 'PASSENGER'}</small><b>{p.author || (ko ? '우리' : 'US')}</b><small>{ko ? '행선지' : 'TO'}</small><b>{captionOf(p) || chapter.note || title}</b><small>{ko ? '날짜' : 'DATE'}</small><b>{dotted(p.day || chapter.day)}</b><span className="ta-ticket-no">NO. {no(i)}</span></div></article>)}</div>;
   case 'magazine': {
    const [lead, ...more] = ps; if (!lead) return null;
    return <div className="ta-mag"><div className="ta-mag-hero">{photo(lead, 0, 'big')}<span className="ta-mag-no">{String(ci + 1).padStart(2, '0')}</span></div>{more.length > 0 && <div className="ta-mag-grid">{more.map((p, i) => photo(p, i + 1, 'small'))}</div>}</div>;
   }
   case 'stamp': return <div className="ta-stamps">{ps.map((p, i) => <div key={p.id} className="ta-stamp">{photo(p, i, 'small')}<span className="ta-postmark" aria-hidden="true">{dotted(p.day || chapter.day).slice(2)}</span></div>)}</div>;
   case 'collage': return <div className="ta-collage">{ps.map((p, i) => photo(p, i, 'small'))}</div>;
   case 'receipt': return <div className="ta-rc-items">{ps.map((p, i) => <div key={p.id} className="ta-rc-item">
    <p className="ta-rc-line"><span>{clock(p.created)}</span><span>{captionOf(p) || p.author || (ko ? '사진' : 'PHOTO')}</span><span>x1</span></p>
    {photo(p, i, 'small', true)}
   </div>)}</div>;
   case 'vinyl': return <div className="ta-jackets">{ps.map((p, i) => <div key={p.id} className="ta-jacket"><span className="ta-jacket-disc" aria-hidden="true"/>{photo(p, i, 'small')}<span className="ta-jacket-no">{String.fromCharCode(65 + (ci % 2))}{i + 1}</span></div>)}</div>;
  }
  // Classic: alternate a big print and tilted pairs so every chapter feels hand-placed.
  const rows: MemoryItem[][] = []; const rest = [...chapter.photos]; let big = ci % 2 === 0;
  while (rest.length) { if (big || rest.length === 1) rows.push(rest.splice(0, 1)); else rows.push(rest.splice(0, 2)); big = !big; }
  let n = 0;
  return rows.map((row, ri) => <div key={ri} className={row.length === 1 ? 'ta-row ta-row-one' : 'ta-row ta-row-two'}>{row.map(p => photo(p, n++, row.length === 1 ? 'big' : 'small'))}</div>);
 }

 if (error) return <div role="alert" className="album-book-message">{ko ? '앨범을 불러오지 못했어요.' : 'Could not load this album.'} <button onClick={() => { setError(false); setRetry(n => n + 1); }}>{ko ? '다시 시도' : 'Retry'}</button></div>;
 if (!items) return <div className="ta-loading" role="status"><Wand2 size={22}/><strong>{ko ? '사진에 테마를 입히는 중…' : 'Decorating your album…'}</strong></div>;

 const countdown = birthday ? dDay(birthday) : '';
 const mineHeld = (items || []).flatMap(i => i.kind === 'photo' ? [i] : i.photos || []).filter(p => p.held && p.mine && p.src && p.mediaType !== 'video');
 const revealDate = revealAt ? new Date(revealAt) : null;
 const revealLabel = revealDate ? revealDate.toLocaleString(ko ? 'ko-KR' : 'en', { month: 'long', day: 'numeric', weekday: 'long', hour: 'numeric', minute: '2-digit' }) : '';
 if (locked && !localItems) return <section className="ta-wrap" aria-label={ko ? '타임캡슐 현상소' : 'Time capsule darkroom'}>
  <div className="ta-capsule">
   <span className="ta-capsule-kicker">{ko ? '타임캡슐 현상소' : 'TIME CAPSULE DARKROOM'}</span>
   <h2>{title}</h2>
   <p className="ta-capsule-when">{ko ? `${revealLabel}에 다 같이 공개돼요` : `Opens for everyone ${revealLabel}`}</p>
   <strong className="ta-capsule-count" role="timer" aria-live="off">{countdownText(Date.parse(revealAt) - now, ko)}</strong>
   <div className="ta-capsule-roll" aria-hidden="true">{Array.from({ length: Math.min(12, Math.max(6, style?.held || 0)) }, (_, i) => <i key={i} className={i < (style?.held || 0) ? 'is-filled' : ''}/>)}</div>
   <p className="ta-capsule-stat">{ko ? `지금까지 ${style?.heldPeople || 0}명이 ${style?.held || 0}장을 맡겼어요` : `${style?.held || 0} photos from ${style?.heldPeople || 0} people so far`}</p>
   {mineHeld.length > 0 && <div className="ta-capsule-mine"><small>{ko ? `내가 맡긴 사진 ${mineHeld.length}장 (나만 보여요)` : `Your ${mineHeld.length} photos (only you can see them)`}</small><div>{mineHeld.slice(0, 8).map(p => <img key={p.id} src={p.src} alt=""/>)}</div></div>}
   <p className="ta-capsule-hint">{ko ? '공개 전까지 사진은 올린 사람만 볼 수 있어요. 일회용 카메라처럼, 현상될 때까지 기다려 주세요.' : 'Until then, photos are visible only to whoever took them. Like a disposable camera, wait for the prints.'}</p>
   {shareable && <button className="primary-button" onClick={share}><Share2 size={16}/>{ko ? '단톡방에 링크 보내기' : 'Send the link to the group'}</button>}
   {editable && <button className="ta-capsule-open" onClick={() => void openCapsule()}>{ko ? '지금 바로 현상하기' : 'Develop now'}</button>}
   {styleError && <p className="ta-style-error" role="alert">{styleError}</p>}
  </div>
  {sharing && createPortal(<AlbumShare folderId={folderId} title={title} theme={theme} locale={locale} canInvite={!!canShare} day={day} photos={[]} people={people}
   message={url => ko ? `⏳ ${title} 타임캡슐이에요!\n각자 찍은 사진을 올려 두면 ${revealLabel}에 한꺼번에 공개돼요.\n${url}` : `⏳ ${title} is a time capsule!\nAdd your photos and they all open together ${revealLabel}.\n${url}`} onClose={() => setSharing('')}/>, document.body)}
 </section>;
 const opened = revealDate && !locked && now - revealDate.getTime() < 3 * 86400000;
 return <section className="ta-wrap" aria-label={ko ? '꾸민 앨범' : 'Themed album'}>
  {shareable && canShare && <div className="ta-album-actions">
   <div><strong>{ko ? '내가 나온 사진은 친구 폰에 있잖아' : 'Your friends have photos of you'}</strong><p>{ko ? '사진 보내달라는 말 대신, 이 앨범으로 바로 받아요. 생일에는 축하 한마디도 부탁해 보세요.' : 'Ask friends to send photos straight to this album, or collect birthday wishes.'}</p></div>
   <div className="ta-album-action-buttons"><Link href={`/?lang=${locale}&album=${encodeURIComponent(folderId)}&view=photos`}>{ko ? '사진 관리·추가' : 'Manage & add photos'}</Link><button type="button" onClick={share}>{ko ? '내 사진 받아오기' : 'Ask for my photos'}</button></div>
  </div>}
  {opened && <div className="ta-capsule-done"><Hourglass size={18}/><div><strong>{ko ? '현상 완료!' : 'Developed!'}</strong><small>{ko ? `${revealLabel}에 모두의 사진이 한꺼번에 공개됐어요.` : `Everyone's photos opened together ${revealLabel}.`}</small></div></div>}
  {birthday !== undefined && <div className="ta-birthday-bar">
   <span className="ta-birthday-count">{countdown || (ko ? '생일' : 'B-day')}</span>
   <div><strong>{people.length ? (ko ? `친구 ${people.length}명이 채웠어요` : `${people.length} ${people.length === 1 ? 'friend has' : 'friends have'} added photos`) : (ko ? '아직 아무도 채우지 않았어요' : 'Nobody has added a photo yet')}</strong><small>{ko ? '단톡방에 링크를 보내면 사진과 한마디가 여기에 쌓여요.' : 'Share the link in the group chat and photos with notes land here.'}</small></div>
   {shareable && <button className="primary-button" onClick={share}>{canShare ? (ko ? '친구 더 부르기' : 'Invite friends') : (ko ? '공유하기' : 'Share')}</button>}
  </div>}
  {canShare && members.length > 1 && <div className="ta-nudge">
   <div><strong>{ko ? `${contributors.size}명이 사진을 보탰어요` : `${contributors.size} ${contributors.size === 1 ? 'person has' : 'people have'} added photos`}</strong>
    {pending.length > 0 ? <span className="ta-nudge-names">{(named.length ? named : []).slice(0, 5).map(n => <i key={n}>{n}</i>)}{pending.length > named.slice(0, 5).length && <i>{ko ? `+${pending.length - named.slice(0, 5).length}명` : `+${pending.length - named.slice(0, 5).length}`}</i>}<small>{ko ? '아직 안 올렸어요' : 'still to add'}</small></span> : <small>{ko ? '모두 사진을 올렸어요 🎉' : 'Everyone has added photos 🎉'}</small>}</div>
   {pending.length > 0 && <button onClick={() => setSharing('nudge')}>{ko ? '조르기' : 'Nudge'}</button>}
  </div>}
  {monthly && <div className="ta-months" role="group" aria-label={ko ? '월별로 보기' : 'View by month'}>
   <button aria-pressed={month === 'all'} onClick={() => setMonth('all')}>{ko ? '전체' : 'All'}</button>
   {months.slice(0, 12).map(m => <button key={m} aria-pressed={month === m} onClick={() => setMonth(m)}>{m === thisMonth ? (ko ? '이번 달 우리' : 'This month of us') : monthName(m)}</button>)}
  </div>}
  {editable && <section className="ta-studio-entry" aria-label={ko ? '다꾸 스튜디오' : 'Album decoration studio'}>
   <div className="ta-studio-entry-head"><span className="ta-studio-entry-icon"><StickerIcon size={19}/></span><div><small>{ko ? '앨범을 우리답게 꾸며요' : 'MAKE IT YOURS'}</small><strong>{ko ? '다꾸 스튜디오' : 'Decoration studio'}</strong><p>{ko ? '사진 위에 스티커를 붙이고 모은 캐릭터도 더해요.' : 'Place stickers on your photo and add collected characters.'}</p></div><button type="button" aria-expanded={studioOpen} onClick={() => setStudioOpen(open => !open)}>{studioOpen ? (ko ? '닫기' : 'Close') : (ko ? '꾸미기' : 'Decorate')}</button></div>
   {studioOpen && <AlbumRewardCover folderId={folderId} ko={ko} owner initiallyOpen photoSrc={cover?.src}/>}
  </section>}
  <details className="ta-picker" open={themePickerOpen} onToggle={event => setThemePickerOpen(event.currentTarget.open)}>
   <summary className="ta-picker-summary"><span className="ta-picker-head"><Palette size={16}/><strong>{ko ? '앨범 테마' : 'Album theme'}</strong><small>{ko ? `${meta.ko} 적용 중 · ${albumThemes.length}가지, 좌우로 넘겨 선택` : `${meta.en} selected · ${albumThemes.length} styles, scroll sideways`}</small></span><span className="ta-picker-chevron" aria-hidden="true">⌄</span></summary>
   <div className={`ta-picker-rail${localItems ? ' is-compact' : ''}`}>
    <button type="button" className="ta-picker-scroll" aria-label={ko ? '이전 앨범 테마' : 'Previous album themes'} onClick={() => themeRowRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}><ArrowLeft size={17}/></button>
    <div ref={themeRowRef} className="ta-picker-row" role="group" aria-label={ko ? '앨범 테마' : 'Album themes'}>
    {albumThemes.map(t => <button key={t.id} className={`ta-swatch swatch-${t.id}`} aria-pressed={theme === t.id} onClick={() => choose(t.id)}>
     <span className="ta-swatch-art" aria-hidden="true">{cover?.src && cover.mediaType !== 'video' ? <img src={cover.src} alt=""/> : <i/>}<span className="ta-swatch-deco"><Deco item={decor[t.id][0]} className=""/></span></span>
     <strong>{ko ? t.ko : t.en}</strong><small>{ko ? t.hintKo : t.hintEn}</small>
     <em>{theme === t.id ? (ko ? '✓ 적용 중' : '✓ On') : (ko ? '눌러보기' : 'Try it')}</em>
    </button>)}
    </div>
    <button type="button" className="ta-picker-scroll" aria-label={ko ? '다음 앨범 테마' : 'Next album themes'} onClick={() => themeRowRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}><ArrowRight size={17}/></button>
   </div>
  </details>
  {editable && birthday === undefined && !locked && <details className="ta-capsule-setup">
   <summary><Hourglass size={16}/><strong>{ko ? '타임캡슐로 만들기' : 'Make it a time capsule'}</strong><small>{ko ? '각자 올린 사진을 정한 시간에 한꺼번에 공개' : 'Everyone’s photos open together at a set time'}</small></summary>
   <p>{ko ? '여행이나 모임 중에 각자 사진을 올려 두면, 공개 시간까지는 올린 사람만 볼 수 있어요. 시간이 되면 모두에게 동시에 열려요.' : 'During the trip everyone adds photos, visible only to themselves. At the set time they open for everyone at once.'}</p>
   <label>{ko ? '공개 시간' : 'Opens at'}<input type="datetime-local" value={capsuleDraft || localInput(nextSundayNine())} min={localInput(new Date(Date.now() + 5 * 60000))} onChange={e => setCapsuleDraft(e.target.value)}/></label>
   <button className="primary-button" onClick={() => void lockCapsule()}><Hourglass size={16}/>{ko ? '잠그고 현상 기다리기' : 'Lock it'}</button>
   {styleError && <p className="ta-style-error" role="alert">{styleError}</p>}
  </details>}

  {!localItems && <div className="ta-card-bar">
   <button onClick={share}><Ticket size={17}/>{ko ? '인스타 카드 뽑기' : 'Make an Instagram card'}</button>
   <small>{ko ? `지금 보는 ${meta.ko} 그대로 스토리 이미지로` : `This ${meta.en} look as a story image`}</small>
  </div>}
  {theme === 'ticket' && !torn && <div className="ta-gate">
   <div className="ta-gate-pass">
    <div className="ta-gate-main">
     <span className="ta-gate-kicker">BOARDING PASS · {ko ? '탑승권' : 'MEMONESTIA AIR'}</span>
     <div className="ta-gate-route"><div><small>FROM</small><b>{ko ? '우리' : 'US'}</b></div><span aria-hidden="true">✈</span><div><small>TO</small><b>{title}</b></div></div>
     <div className="ta-gate-meta"><div><small>{ko ? '날짜' : 'DATE'}</small><b>{day ? dotted(day) : '—'}</b></div><div><small>{ko ? '탑승객' : 'PAX'}</small><b>{people.length || 1}</b></div><div><small>{ko ? '사진' : 'PHOTOS'}</small><b>{allPhotos.length}</b></div><div><small>GATE</small><b>07</b></div></div>
    </div>
    <button className="ta-gate-stub" onPointerDown={tear} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); board(e.currentTarget); } }} aria-label={ko ? '탑승권 뜯고 앨범 열기' : 'Tear the pass and open the album'}>
     {cover?.src && cover.mediaType !== 'video' ? <img src={cover.src} alt=""/> : <i/>}
     <b>{ko ? '뜯어서 탑승' : 'TEAR TO BOARD'}</b><span aria-hidden="true">→</span>
    </button>
   </div>
   <p>{ko ? '오른쪽 표를 옆으로 밀어 뜯으면 여행 앨범이 열려요' : 'Swipe the stub to tear it and open the album'}</p>
  </div>}
  {theme === 'receipt' && <div className="ta-printer" aria-hidden="true"><span/></div>}
  {!(theme === 'ticket' && !torn) && <div key={theme} className={`ta-album theme-${theme}`}>
   {theme === 'birthday' && <div className="ta-garland" aria-hidden="true">{Array.from({ length: 11 }, (_, i) => <i key={i}/>)}</div>}
   <header className="ta-cover">
    <span className="ta-kicker">{meta.kicker}</span>
    {theme === 'vinyl' ? <div className="ta-turntable">
     <div className="ta-sleeve">{stills.length ? <img key={slide % stills.length} src={stills[slide % stills.length].src} alt=""/> : <i/>}</div>
     <div className="ta-record" aria-hidden="true"><span className="ta-record-label">{cover?.src && cover.mediaType !== 'video' ? <img src={cover.src} alt=""/> : null}</span></div>
     <span className="ta-tonearm" aria-hidden="true"/>
    </div> : cover && <div className="ta-cover-photo">{photo(cover, 0, 'big', true)}<Deco item={decor[theme][0]} className="ta-at-cover-a"/><Deco item={decor[theme][1]} className="ta-at-cover-b"/></div>}
    {theme === 'vinyl' && <div className="ta-nowplaying">
     <Music2 size={16}/><div><small>NOW PLAYING</small>{songDraft === null ? <b>{song || (ko ? '우리의 노래' : 'Our song')}</b>
      : <input autoFocus maxLength={80} value={songDraft} onChange={e => setSongDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void saveSong(); if (e.key === 'Escape') setSongDraft(null); }} placeholder={ko ? '예: 검정치마 - Everything' : 'e.g. Artist - Song'} aria-label={ko ? '그날의 노래' : 'Song of the day'}/>}</div>
     {songDraft !== null ? <button onClick={() => void saveSong()}>{ko ? '저장' : 'Save'}</button>
      : <>{song && <a href={songSearch(song)} target="_blank" rel="noopener noreferrer">{ko ? '노래 듣기' : 'Listen'}</a>}{editable && <button onClick={() => setSongDraft(song)}>{song ? (ko ? '바꾸기' : 'Change') : (ko ? '그날의 노래 정하기' : 'Pick the song')}</button>}</>}
    </div>}
    {theme === 'vinyl' && styleError && <p className="ta-style-error" role="alert">{styleError}</p>}
    <h2>{monthly && month !== 'all' ? monthTitle(month) : title}</h2>
    {monthly && month !== 'all' && <p className="ta-cover-note">{title}</p>}
    {description && <p className="ta-cover-note">{description}</p>}
    <p className="ta-cover-meta">{day && <span>{dotted(day)}</span>}{people.length > 0 && <span>{people.slice(0, 4).join(' · ')}{people.length > 4 ? (ko ? ` 외 ${people.length - 4}명` : ` +${people.length - 4}`) : ''}</span>}</p>

   </header>
   {shown.map((chapter, ci) => <section key={`${chapter.id}:${ci}`} className="ta-chapter">
    <div className="ta-chapter-head"><span className="ta-chapter-label">{meta.chapter} {String(ci + 1).padStart(2, '0')}</span>{chapter.note && <p className="ta-note">{chapter.note}</p>}</div>
    <Deco item={decor[theme][(ci * 2 + 2) % decor[theme].length]} className="ta-at-a"/>
    {spread(chapter, ci)}
    <Deco item={decor[theme][(ci * 2 + 3) % decor[theme].length]} className="ta-at-b"/>
   </section>)}
   {!shown.length && <p className="ta-empty">{ko ? '사진과 한 줄 메모를 올리면 이 테마로 자동으로 꾸며져요.' : 'Add photos and a note, and this theme decorates them for you.'}</p>}
   {theme === 'receipt' && <div className="ta-rc-total">
    <p><span>{ko ? '총 사진' : 'TOTAL PHOTOS'}</span><b>{allPhotos.length}</b></p>
    <p><span>{ko ? '함께한 사람' : 'PEOPLE'}</span><b>{Math.max(1, people.length)}</b></p>
    <p><span>{ko ? '결제' : 'PAID WITH'}</span><b>{ko ? '추억 100%' : 'MEMORIES'}</b></p>
    <span className="ta-rc-barcode" aria-hidden="true"/>
    <small>{ko ? '이 영수증은 다시 볼 수 있어요 · 환불 불가' : 'Keep this receipt · No refunds'}</small>
   </div>}
   <footer className="ta-end">
    <span className="ta-end-stamp">THE END</span>
    <p>{ko ? `${people.length > 1 ? `${people.length}명이 함께 채운` : '우리의'} 앨범 · 사진 ${allPhotos.length}장` : `${people.length > 1 ? `Filled in by ${people.length} friends` : 'Our album'} · ${allPhotos.length} photos`}</p>
    <small>memonestia.</small>
   </footer>
  </div>}

  {shareable && <div className="ta-share">
   <div><strong>{ko ? '카톡·인스타·쓰레드로 자랑하기' : 'Share to KakaoTalk, Instagram, Threads'}</strong><p>{canShare ? (ko ? '링크를 연 친구는 꾸민 앨범을 바로 보고 자기 사진도 보탤 수 있어요. 인스타 스토리용 이미지도 만들어 드려요.' : 'Friends who open the link see this album and can add photos. A story image is made for Instagram, too.') : (ko ? '꾸민 앨범을 인스타 스토리 이미지로 만들어 드려요.' : 'Turn this album into an Instagram story image.')}</p></div>
   <button className="primary-button" onClick={share}><Share2 size={16}/>{ko ? '앨범 공유하기' : 'Share album'}</button>
  </div>}
  {sharing && createPortal(<AlbumShare folderId={folderId} title={monthly && month !== 'all' ? monthTitle(month) : title} theme={theme} locale={locale} canInvite={!!canShare} day={day}
   photos={[cover, ...allPhotos.filter(p => p !== cover)].filter(p => p && p.mediaType !== 'video' && p.src).slice(0, 3).map(p => p!.src!)} people={people}
   message={url => sharing === 'nudge' ? nudgeMessage(url, countdown) : albumShareMessage(title, url, ko, birthday !== undefined, !!canShare)} onClose={() => setSharing('')}/>, document.body)}

  {browsing && <div className="ta-cta">
   <div><strong>{ko ? `${meta.ko} 테마로 우리 앨범 만들기` : `Make ours in ${meta.en}`}</strong><p>{ko ? '사진 몇 장과 한 줄 메모만 올리면, 꾸미기는 자동이에요. 친구들도 링크로 같이 채워요.' : 'Add a few photos and a note. The decorating is automatic, and friends can fill it in from a link.'}</p></div>
   {theme === 'birthday' ? <Link className="primary-button" href={`/birthday?lang=${locale}`}>{ko ? '1분 만에 시작하기' : 'Start in a minute'}<ArrowRight size={16}/></Link>
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Leaving Explore needs a full load so its read-only state does not carry over.
    : <button className="primary-button" onClick={() => { window.location.href = `/?lang=${locale}&quick=1`; }}>{ko ? '내 사진으로 1분 만에 만들기' : 'Make mine in a minute'}<ArrowRight size={16}/></button>}
  </div>}
 </section>;
}
