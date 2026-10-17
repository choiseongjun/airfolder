'use client';
/* eslint-disable @next/next/no-img-element -- Swatch thumbnails reuse the album's already-loaded photo URLs. */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Share2, Sparkles, Wand2 } from 'lucide-react';
import { api } from '@/lib/client-api';
import { browseTheme } from '@/lib/browse-data';
import type { MemoryItem } from './memories';
import MediaView from './media-view';
import './theme-album.css';

export const albumThemes = [
 { id: 'polaroid', ko: '폴라로이드 썸머', en: 'Polaroid Summer', hintKo: '파란 바다, 마스킹테이프, 손글씨', hintEn: 'Blue sea, washi tape, handwriting', kicker: 'SUMMER DIARY', chapter: 'DAY' },
 { id: 'film', ko: '필름 아카이브', en: 'Film Archive', hintKo: '필름 프레임과 주황 날짜 도장', hintEn: 'Film frames & orange date stamps', kicker: 'ROLL 01 · 36 EXP', chapter: 'FRAME' },
 { id: 'softgirl', ko: '소프트 걸', en: 'Soft Girl', hintKo: '핑크 깅엄, 리본, 하트', hintEn: 'Pink gingham, ribbons & hearts', kicker: 'xoxo, us', chapter: '♡' },
 { id: 'birthday', ko: '버스데이 필름', en: 'Birthday Film', hintKo: '가랜드, 컨페티, 케이크', hintEn: 'Garland, confetti & cake', kicker: 'HAPPY BIRTHDAY', chapter: 'PART' },
] as const;
export type AlbumThemeId = typeof albumThemes[number]['id'];

type StickerKind = 'sun' | 'wave' | 'star' | 'heart' | 'bow' | 'sparkle' | 'cake' | 'balloon' | 'flower';
type Decor = StickerKind | { text: string };
const decor: Record<AlbumThemeId, Decor[]> = {
 polaroid: ['sun', { text: 'summer!' }, 'wave', 'star', { text: 'best day ever' }, 'flower'],
 film: [{ text: 'MEMO 400' }, 'sparkle', { text: '★ keep' }, 'star', { text: 'NO. 07' }, 'sparkle'],
 softgirl: ['heart', 'sparkle', { text: 'xoxo' }, 'bow', 'flower', { text: 'so cute' }],
 birthday: ['cake', 'balloon', { text: 'HBD!' }, 'star', { text: 'make a wish' }, 'heart'],
};

function Sticker({ kind }: { kind: StickerKind }) {
 const art: Record<StickerKind, React.ReactNode> = {
  sun: <><circle cx="32" cy="32" r="13" fill="#ffd25e" stroke="#f29b38" strokeWidth="3"/>{Array.from({ length: 8 }, (_, i) => <path key={i} d="M32 6v9" stroke="#f29b38" strokeWidth="4" strokeLinecap="round" transform={`rotate(${i * 45} 32 32)`}/>)}</>,
  wave: <path d="M4 38c7-9 14-9 21 0s14 9 21 0 11-8 14-4M4 50c7-9 14-9 21 0s14 9 21 0 11-8 14-4" fill="none" stroke="#4aa3d8" strokeWidth="5" strokeLinecap="round"/>,
  star: <path d="M32 5l7.6 16.3 17.9 2.1-13.2 12.2 3.5 17.7L32 44.5l-15.8 8.8 3.5-17.7L6.5 23.4l17.9-2.1z" fill="#ffd25e" stroke="#e9a23b" strokeWidth="3" strokeLinejoin="round"/>,
  heart: <path d="M32 54S8 40 8 23a12 12 0 0 1 24-4 12 12 0 0 1 24 4c0 17-24 31-24 31z" fill="#ff8fb1" stroke="#e5577f" strokeWidth="3" strokeLinejoin="round"/>,
  bow: <><path d="M32 30C22 14 6 16 8 28s16 10 24 2zM32 30c10-16 26-14 24-2s-16 10-24 2z" fill="#ffb3c8" stroke="#e46d93" strokeWidth="3" strokeLinejoin="round"/><path d="M29 33l-9 22M35 33l9 22" stroke="#e46d93" strokeWidth="5" strokeLinecap="round"/><circle cx="32" cy="30" r="5" fill="#ff8fb1" stroke="#e46d93" strokeWidth="3"/></>,
  sparkle: <path d="M32 4c3 16 8 21 24 28-16 7-21 12-24 28-3-16-8-21-24-28 16-7 21-12 24-28z" fill="#fff4c9" stroke="#e1b552" strokeWidth="3" strokeLinejoin="round"/>,
  cake: <><rect x="12" y="32" width="40" height="22" rx="5" fill="#ffd9e4" stroke="#e46d93" strokeWidth="3"/><path d="M12 40c5 4 9 4 13 0s9-4 14 0 9 4 13 0" fill="none" stroke="#fff" strokeWidth="4"/><path d="M24 31V20M32 31V18M40 31V20" stroke="#7cc4e8" strokeWidth="4" strokeLinecap="round"/><path d="M24 15c-2-3 2-6 0-8 4 2 3 6 0 8zM32 13c-2-3 2-6 0-8 4 2 3 6 0 8zM40 15c-2-3 2-6 0-8 4 2 3 6 0 8z" fill="#ffb02e"/></>,
  balloon: <><ellipse cx="32" cy="24" rx="15" ry="18" fill="#8fd0ff" stroke="#3d93cf" strokeWidth="3"/><path d="M29 42h6l-3 4z" fill="#3d93cf"/><path d="M32 46c-5 6 5 9 0 15" fill="none" stroke="#7a7a7a" strokeWidth="2"/><ellipse cx="26" cy="17" rx="3" ry="5" fill="#fff" opacity=".7"/></>,
  flower: <>{Array.from({ length: 5 }, (_, i) => <ellipse key={i} cx="32" cy="17" rx="8" ry="12" fill="#fff" stroke="#f0a1b8" strokeWidth="3" transform={`rotate(${i * 72} 32 32)`}/>)}<circle cx="32" cy="32" r="7" fill="#ffd25e" stroke="#e9a23b" strokeWidth="3"/></>,
 };
 return <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">{art[kind]}</svg>;
}
function Deco({ item, className }: { item: Decor; className: string }) {
 return typeof item === 'string' ? <span className={`ta-sticker ${className}`} aria-hidden="true"><Sticker kind={item}/></span> : <span className={`ta-sticker ta-sticker-text ${className}`} aria-hidden="true">{item.text}</span>;
}

type Chapter = { id: string; note: string; day: string; photos: MemoryItem[] };
const fileLike = /(^(img|dsc|pxl|kakaotalk)[_-])|\.(jpe?g|png|heic|webp|gif|mp4|mov)$/i;
function savedTheme(folderId: string, birthday: boolean): AlbumThemeId {
 const fallback = birthday ? 'birthday' : (browseTheme(folderId) as AlbumThemeId | undefined) || 'polaroid';
 try { const saved = localStorage.getItem('memonestia-album-theme:' + folderId); return albumThemes.some(t => t.id === saved) ? saved as AlbumThemeId : fallback; } catch { return fallback; }
}
const dotted = (day: string) => day.replaceAll('-', '.');
const stamp = (day: string) => `'${day.slice(2, 4)} ${day.slice(5, 7)} ${day.slice(8, 10)}`;

function dDay(day: string) {
 const now = new Date(), left = Math.round((Date.parse(day + 'T00:00:00Z') - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
 return left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : '';
}

export function albumShareMessage(title: string, url: string, ko: boolean, birthday: boolean) {
 if (birthday) return ko ? `🎂 ${title} 앨범이에요!\n같이 찍은 사진 한 장이랑 한마디 남겨줘. 생일날 한 권으로 보여줄 거야 🤫\n${url}` : `🎂 ${title} album!\nAdd a photo and a short note. We'll show it on the big day 🤫\n${url}`;
 return ko ? `📸 ${title} 앨범 같이 보자!\n열면 꾸민 앨범이 바로 보이고, 내 사진도 한 장씩 보탤 수 있어.\n${url}` : `📸 Let's look at our ${title} album!\nIt opens decorated, and you can add your own photos too.\n${url}`;
}

/** `birthday` is the party date (or '' when unknown) for birthday albums; undefined otherwise. */
export default function ThemeAlbum({ folderId, title, description, locale, browsing, birthday, canShare, onPhoto }: { folderId: string; title: string; description: string; locale: 'ko' | 'en'; browsing: boolean; birthday?: string; canShare?: boolean; onPhoto: (item: MemoryItem) => void }) {
 const ko = locale === 'ko';
 const [sharing, setSharing] = useState(false), [shareNote, setShareNote] = useState('');
 // The album's invite link doubles as its share link: it opens on this decorated view and lets people add photos.
 async function share() {
  if (sharing) return;
  setSharing(true); setShareNote('');
  try {
   const { token } = await api<{ token: string }>('/api/invites', { method: 'POST', body: JSON.stringify({ folderId }) });
   const url = `${window.location.origin}/join/${token}?lang=${locale}`, text = albumShareMessage(title, url, ko, birthday !== undefined);
   if (navigator.share) { try { await navigator.share({ text }); } catch { /* Closing the share sheet is not an error. */ } }
   else { await navigator.clipboard.writeText(text); setShareNote(ko ? '공유 메시지를 복사했어요. 단톡방에 붙여넣으세요.' : 'Share message copied. Paste it in your group chat.'); }
  } catch { setShareNote(ko ? '공유 링크를 만들지 못했어요. 다시 시도해 주세요.' : 'Could not make a share link. Please try again.'); }
  finally { setSharing(false); }
 }
 const [theme, setTheme] = useState<AlbumThemeId>(() => savedTheme(folderId, birthday !== undefined));
 const [items, setItems] = useState<MemoryItem[] | null>(null), [error, setError] = useState(false), [retry, setRetry] = useState(0);
 useEffect(() => {
  const controller = new AbortController();
  (async () => {
   try {
    const all: MemoryItem[] = []; let more = true;
    while (more) { const data = await api<{ items: MemoryItem[]; hasMore: boolean }>(`/api/memories?folderId=${folderId}&offset=${all.length}&timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { signal: controller.signal }); all.push(...data.items); more = data.hasMore; }
    if (!controller.signal.aborted) { setItems(all.reverse()); setError(false); }
   } catch { if (!controller.signal.aborted) setError(true); }
  })();
  return () => controller.abort();
 }, [folderId, retry]);

 const chapters = useMemo(() => {
  const list: Chapter[] = [];
  for (const item of items || []) {
   // Photos bundled under a note inherit its writer, so every print carries a friend's name.
   const photos = (item.kind === 'photo' ? [item] : item.photos || []).filter(p => p.src).map(p => p.author ? p : { ...p, author: item.author });
   const note = item.kind === 'record' ? (item.body || item.title || '').trim() : '';
   const last = list[list.length - 1];
   // Loose photos from the same day read better as one spread than as many one-photo chapters.
   if (!note && last && !last.note && last.day === item.day) last.photos.push(...photos);
   else if (note || photos.length) list.push({ id: item.id, note, day: item.day, photos });
  }
  return list;
 }, [items]);
 const allPhotos = chapters.flatMap(c => c.photos);
 const people = [...new Set(allPhotos.map(p => p.author).filter(Boolean))];
 // The closing shot (often the group selfie) makes the best cover and avoids repeating the first print.
 const cover = allPhotos.findLast(p => p.mediaType !== 'video') || allPhotos[0];
 const meta = albumThemes.find(t => t.id === theme)!;
 const day = birthday || chapters[0]?.day || '';

 function choose(id: AlbumThemeId) {
  setTheme(id);
  try { localStorage.setItem('memonestia-album-theme:' + folderId, id); } catch {}
 }
 function photo(p: MemoryItem, index: number, size: 'big' | 'small', bare = false) {
  const caption = !bare && p.body && !fileLike.test(p.body.trim()) ? p.body : '';
  return <figure key={p.id} className={`ta-photo ta-${size}`} style={{ '--i': index } as React.CSSProperties}>
   <button onClick={() => onPhoto(p)} aria-label={ko ? `${caption || title} 크게 보기` : `Open ${caption || title}`}>
    <span className="ta-frame"><MediaView src={p.src!} name={caption || title} mediaType={p.mediaType}/>{theme === 'film' && p.day && <span className="ta-date-stamp" aria-hidden="true">{stamp(p.day)}</span>}</span>
   </button>
   {!bare && (caption || p.author) && <figcaption>{caption && <span className="ta-caption">{caption}</span>}{p.author && <span className="ta-by">— {p.author}</span>}</figcaption>}
  </figure>;
 }
 function spread(chapter: Chapter, ci: number) {
  // Alternate a big print and tilted pairs so every chapter feels hand-placed.
  const rows: MemoryItem[][] = []; const rest = [...chapter.photos]; let big = ci % 2 === 0;
  while (rest.length) { if (big || rest.length === 1) rows.push(rest.splice(0, 1)); else rows.push(rest.splice(0, 2)); big = !big; }
  let n = 0;
  return rows.map((row, ri) => <div key={ri} className={row.length === 1 ? 'ta-row ta-row-one' : 'ta-row ta-row-two'}>{row.map(p => photo(p, n++, row.length === 1 ? 'big' : 'small'))}</div>);
 }

 if (error) return <div role="alert" className="album-book-message">{ko ? '앨범을 불러오지 못했어요.' : 'Could not load this album.'} <button onClick={() => { setError(false); setRetry(n => n + 1); }}>{ko ? '다시 시도' : 'Retry'}</button></div>;
 if (!items) return <div className="ta-loading" role="status"><Wand2 size={22}/><strong>{ko ? '사진에 테마를 입히는 중…' : 'Decorating your album…'}</strong></div>;

 const countdown = birthday ? dDay(birthday) : '';
 return <section className="ta-wrap" aria-label={ko ? '꾸민 앨범' : 'Themed album'}>
  {birthday !== undefined && <div className="ta-birthday-bar">
   <span className="ta-birthday-count">{countdown || '🎂'}</span>
   <div><strong>{people.length ? (ko ? `친구 ${people.length}명이 채웠어요` : `${people.length} ${people.length === 1 ? 'friend has' : 'friends have'} added photos`) : (ko ? '아직 아무도 채우지 않았어요' : 'Nobody has added a photo yet')}</strong><small>{ko ? '단톡방에 링크를 보내면 사진과 한마디가 여기에 쌓여요.' : 'Share the link in the group chat and photos with notes land here.'}</small></div>
   {canShare && <button className="primary-button" disabled={sharing} onClick={() => void share()}>{ko ? '친구 더 부르기' : 'Invite friends'}</button>}
  </div>}
  <div className="ta-picker">
   <div className="ta-picker-head"><Sparkles size={16}/><strong>{ko ? '앨범 테마 눌러보기' : 'Tap a theme to try it'}</strong><small>{ko ? '사진과 메모는 그대로, 꾸미기는 자동으로' : 'Same photos and notes, decorated for you'}</small>{canShare && birthday === undefined && <button className="ta-share-mini" disabled={sharing} onClick={() => void share()}><Share2 size={14}/>{ko ? '공유' : 'Share'}</button>}</div>
   <div className="ta-picker-row" role="group" aria-label={ko ? '앨범 테마' : 'Album themes'}>
    {albumThemes.map(t => <button key={t.id} className={`ta-swatch swatch-${t.id}`} aria-pressed={theme === t.id} onClick={() => choose(t.id)}>
     <span className="ta-swatch-art" aria-hidden="true">{cover?.src && cover.mediaType !== 'video' ? <img src={cover.src} alt=""/> : <i/>}<span className="ta-swatch-deco"><Deco item={decor[t.id][0]} className=""/></span></span>
     <strong>{ko ? t.ko : t.en}</strong><small>{ko ? t.hintKo : t.hintEn}</small>
     <em>{theme === t.id ? (ko ? '✓ 적용 중' : '✓ On') : (ko ? '눌러보기' : 'Try it')}</em>
    </button>)}
   </div>
  </div>

  <div key={theme} className={`ta-album theme-${theme}`}>
   {theme === 'birthday' && <div className="ta-garland" aria-hidden="true">{Array.from({ length: 11 }, (_, i) => <i key={i}/>)}</div>}
   <header className="ta-cover">
    <span className="ta-kicker">{meta.kicker}</span>
    {cover && <div className="ta-cover-photo">{photo(cover, 0, 'big', true)}<Deco item={decor[theme][0]} className="ta-at-cover-a"/><Deco item={decor[theme][1]} className="ta-at-cover-b"/></div>}
    <h2>{title}</h2>
    {description && <p className="ta-cover-note">{description}</p>}
    <p className="ta-cover-meta">{day && <span>{dotted(day)}</span>}{people.length > 0 && <span>{people.slice(0, 4).join(' · ')}{people.length > 4 ? (ko ? ` 외 ${people.length - 4}명` : ` +${people.length - 4}`) : ''}</span>}</p>
   </header>
   {chapters.map((chapter, ci) => <section key={chapter.id} className="ta-chapter">
    <div className="ta-chapter-head"><span className="ta-chapter-label">{meta.chapter} {String(ci + 1).padStart(2, '0')}</span>{chapter.note && <p className="ta-note">{chapter.note}</p>}</div>
    <Deco item={decor[theme][(ci * 2 + 2) % decor[theme].length]} className="ta-at-a"/>
    {spread(chapter, ci)}
    <Deco item={decor[theme][(ci * 2 + 3) % decor[theme].length]} className="ta-at-b"/>
   </section>)}
   {!chapters.length && <p className="ta-empty">{ko ? '사진과 한 줄 메모를 올리면 이 테마로 자동으로 꾸며져요.' : 'Add photos and a note, and this theme decorates them for you.'}</p>}
   <footer className="ta-end">
    <span className="ta-end-stamp">THE END</span>
    <p>{ko ? `${people.length > 1 ? `${people.length}명이 함께 채운` : '우리의'} 앨범 · 사진 ${allPhotos.length}장` : `${people.length > 1 ? `Filled in by ${people.length} friends` : 'Our album'} · ${allPhotos.length} photos`}</p>
    <small>memonestia.</small>
   </footer>
  </div>

  {canShare && <div className="ta-share">
   <div><strong>{ko ? '이 앨범, 같이 보고 같이 채워요' : 'Share it, fill it together'}</strong><p>{ko ? '링크를 연 사람은 꾸민 앨범을 바로 보고, 자기 사진도 보탤 수 있어요. 앱 설치는 필요 없어요.' : 'People who open the link see this decorated album and can add their own photos. No app needed.'}</p></div>
   <button className="primary-button" disabled={sharing} onClick={() => void share()}><Share2 size={16}/>{sharing ? (ko ? '링크 만드는 중…' : 'Making link…') : (ko ? '앨범 공유하기' : 'Share album')}</button>
  </div>}
  {shareNote && <p className="ta-share-note" role="status">{shareNote}</p>}

  {browsing && <div className="ta-cta">
   <div><strong>{ko ? `${meta.ko} 테마로 우리 앨범 만들기` : `Make ours in ${meta.en}`}</strong><p>{ko ? '사진 몇 장과 한 줄 메모만 올리면, 꾸미기는 자동이에요. 친구들도 링크로 같이 채워요.' : 'Add a few photos and a note. The decorating is automatic, and friends can fill it in from a link.'}</p></div>
   <Link className="primary-button" href={theme === 'birthday' ? `/birthday?lang=${locale}` : `/start?lang=${locale}`}>{ko ? '1분 만에 시작하기' : 'Start in a minute'}<ArrowRight size={16}/></Link>
  </div>}
 </section>;
}
