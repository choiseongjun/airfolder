'use client';
/* eslint-disable @next/next/no-img-element -- Thumbnails are local object URLs of photos not uploaded yet. */
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Camera, ImagePlus, PencilLine, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { IMAGE_LIMIT } from '@/lib/media-limits';
import { TERMS_VERSION } from '@/lib/policy';
import { groupDuplicates, hashImage } from '@/lib/photo-duplicates';
import { mapLimit } from '@/lib/parallel';
import ThemeAlbum from './theme-album';
import type { MemoryItem } from './memories';
import Consent from './growth/consent';
import { STUDIO_STICKERS, STUDIO_STICKER_COPY, nextStickerPosition, type StudioSticker } from '@/lib/reward-decoration';
import './quick-album.css';

type Pick = { id: string; file?: File; url: string; taken: number; video?: boolean };
type Day = { key: string; picks: Pick[]; note: string };
type EditAlbumItem = { id: string; folderId: string; title: string; body: string; day: string; shared: boolean; recipients: string[]; revision: number; photos: { id: string; src: string; video: boolean; day: string | null }[] };
const MAX_PHOTOS = 30, PER_CHAPTER = 8;
const SAMPLES = [
  '/explore/album-samples/cafe-friends.jpg',
  '/explore/album-samples/family-birthday.jpg',
  '/explore/album-samples/hiking-friends.jpg',
  '/explore/album-samples/spring-picnic.jpg',
  '/explore/album-samples/bbq-friends.jpg',
  '/explore/album-samples/jeju-couple.jpg',
  '/explore/album-samples/festival-friends.jpg',
  '/explore/album-samples/autumn-family.jpg',
  '/explore/photo-43.jpg',
  '/explore/photo-44.jpg',
];
// Ready-made handwritten lines, so nobody has to type anything for the album to feel finished.
const STAMPS = {
  ko: ['함께여서 좋았던 날 ♡', '오늘의 우리, 맑음', '배부르고 행복했던 순간', '이 장면은 꼭 남겨야 해', '돌아가고 싶은 그 시간', '웃음이 끊이지 않던 하루'],
  en: ['the good little days ♡', 'us, sunny all day', 'full and happy', 'this one we keep', 'take me back here', 'we never stopped laughing'],
};
const STUDIO_CATEGORIES = [
  { id: 'jokes', label: '🔥 킹받는 장난' },
  { id: 'cafe', label: '📦 카페&디저트' },
  { id: 'roast', label: '🗨️ 단톡 팩폭' },
] as const;
const dayKey = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** When the photo was taken: the camera's EXIF time, else the file's own date. */
async function takenAt(file: File) {
  const fallback = Math.min(file.lastModified || Date.now(), Date.now());
  try {
    const { default: exifr } = await import('exifr');
    const tags = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate'] }) as { DateTimeOriginal?: Date; CreateDate?: Date } | undefined;
    const date = tags?.DateTimeOriginal || tags?.CreateDate;
    return date instanceof Date && !Number.isNaN(date.getTime()) && date.getTime() <= Date.now() ? date.getTime() : fallback;
  } catch { return fallback; }
}

/** The first-visit path: pick a trip's photos at once, see them sorted by day and decorated, then keep the album. */
export default function QuickAlbum({ locale, onClose, onSaved, onBlank, groupId = null, editItem }: { locale: 'ko' | 'en'; onClose: () => void; onSaved: (folderId: string) => void; onBlank?: () => void; groupId?: string | null; editItem?: EditAlbumItem }) {
  const ko = locale === 'ko', t = (a: string, b: string) => ko ? a : b;
  const [step, setStep] = useState<'pick' | 'preview' | 'note'>('pick');
  const [picks, setPicks] = useState<Pick[]>(() => editItem ? editItem.photos.map(photo => ({ id: photo.id, url: photo.src, taken: new Date(`${photo.day || editItem.day}T12:00:00`).getTime(), video: photo.video })) : []), [reading, setReading] = useState(false), [name, setName] = useState(editItem?.title || ''), [note, setNote] = useState(editItem?.body || '');
  const [crewMeta, setCrewMeta] = useState<{name: string; members: number} | null>(null);
  const [scanning, setScanning] = useState(false), [grouped, setGrouped] = useState(0);
  const [accepted, setAccepted] = useState<boolean | null>(null), [consent, setConsent] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [studioStickers, setStudioStickers] = useState<StudioSticker[]>([]), [studioTab, setStudioTab] = useState<typeof STUDIO_CATEGORIES[number]['id']>('jokes'), [selectedStudioSticker, setSelectedStudioSticker] = useState<string | null>(null);
  const studioStage = useRef<HTMLDivElement>(null), studioDragging = useRef<string | null>(null);
  const [saving, setSaving] = useState(''), [error, setError] = useState('');
  const urls = useRef<string[]>([]), [todayKey] = useState(() => dayKey(Date.now()));
  useEffect(() => { let active = true; api<{ accepted: boolean }>('/api/policy').then(p => { if (active) setAccepted(p.accepted); }).catch(() => { if (active) setAccepted(false); }); return () => { active = false; }; }, []);
  useEffect(() => { if (!groupId) return; let active = true; api<{crew: {name: string | null; members: unknown[]}}>(`/api/feed?group=${encodeURIComponent(groupId)}`).then(data => { if (active) setCrewMeta({name: data.crew.name || (locale === 'ko' ? '우리 크루' : 'Our crew'), members: data.crew.members.length}); }).catch(() => { if (active) setCrewMeta({name: (locale === 'ko' ? '선택한 크루' : 'Selected crew'), members: 1}); }); return () => { active = false; }; }, [groupId, locale]);
  useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), []);
  useEffect(() => { const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = overflow; }; }, []);

  async function add(files: File[], times?: number[]) {
    const room = MAX_PHOTOS - picks.length;
    const usable = files.filter(f => f.size && f.size <= IMAGE_LIMIT && (f.type.startsWith('image/') || f.type.startsWith('video/') || /\.(heic|heif|jpe?g|png|webp|mp4|mov|webm)$/i.test(f.name))).slice(0, room);
    setError(files.length > usable.length ? t(`사진은 ${MAX_PHOTOS}장, 장당 20MB까지 담을 수 있어요.`, `Up to ${MAX_PHOTOS} photos, 20 MB each.`) : '');
    if (!usable.length) return;
    setReading(true);
    const fresh = await Promise.all(usable.map(async (file, i) => {
      const url = URL.createObjectURL(file); urls.current.push(url);
      return { id: crypto.randomUUID(), file, url, taken: times?.[i] ?? await takenAt(file), video: file.type.startsWith('video/') };
    }));
    setPicks(old => [...old, ...fresh].sort((a, b) => a.taken - b.taken));
    setReading(false);
  }
  async function addSamples() {
    try {
      const shuffled = [...SAMPLES];
      for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
      const sampleCount = [6, 8, 10][Math.floor(Math.random() * 3)];
      const selected = shuffled.slice(0, sampleCount);
      const files = await Promise.all(selected.map(async (src, i) => {
        const response = await fetch(src);
        if (!response.ok) throw new Error('SAMPLE_LOAD_FAILED');
        return new File([await response.blob()], `sample-${i + 1}.jpg`, { type: 'image/jpeg' });
      }));
      // Sample photos carry no camera time, so spread them over a two-day trip to show the day split.
      const start = new Date(); start.setDate(start.getDate() - 2); start.setHours(10, 20, 0, 0);
      const secondDayStart = Math.ceil(selected.length / 2);
      const times = selected.map((_, i) => (i < secondDayStart ? i * 110 : 1440 + (i - secondDayStart) * 110));
      await add(files, times.map(min => start.getTime() + min * 60000));
    } catch { setError(t('샘플 사진을 불러오지 못했어요.', 'Could not load the sample photos.')); setReading(false); }
  }
  function remove(id: string) { setPicks(old => old.filter(p => p.id !== id)); }
  function addStudioSticker(sticker: typeof STUDIO_STICKERS[number]) {
    if (studioStickers.length >= 12) return;
    const item: StudioSticker = { id: crypto.randomUUID(), sticker: sticker.id, kind: sticker.kind, ...nextStickerPosition(studioStickers), size: 32, rotation: 0 };
    setStudioStickers(old => [...old, item]); setSelectedStudioSticker(item.id);
  }
  function moveStudioSticker(event: PointerEvent<HTMLDivElement>) {
    const moving = studioDragging.current, bounds = studioStage.current?.getBoundingClientRect();
    if (!moving || !bounds) return;
    const x = Math.max(5, Math.min(95, (event.clientX - bounds.left) / bounds.width * 100));
    const y = Math.max(5, Math.min(95, (event.clientY - bounds.top) / bounds.height * 100));
    setStudioStickers(old => old.map(item => item.id === moving ? { ...item, x, y } : item));
  }

  /** Composes a cluster of near-identical shots into one mini-grid image, instead of making
   *  someone decide which to throw away — nothing a guest picked ever gets silently dropped. */
  async function composeGroup(group: Pick[]): Promise<Pick> {
    const imgs = await Promise.all(group.slice(0, 4).map(p => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = p.url;
    })));
    const cols = imgs.length > 1 ? 2 : 1, rows = Math.ceil(imgs.length / cols), gap = 12, cell = 560;
    const w = cols * cell + gap * (cols + 1), h = rows * cell + gap * (rows + 1);
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    imgs.forEach((img, i) => {
      const x = gap + (i % cols) * (cell + gap), y = gap + Math.floor(i / cols) * (cell + gap);
      const scale = Math.max(cell / img.width, cell / img.height), sw = cell / scale, sh = cell / scale;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, cell, cell);
    });
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('NO_BLOB')), 'image/jpeg', .92));
    const file = new File([blob], `moment-${group[0].id}.jpg`, { type: 'image/jpeg' });
    const url = URL.createObjectURL(file); urls.current.push(url);
    return { id: crypto.randomUUID(), file, url, taken: Math.min(...group.map(p => p.taken)) };
  }

  // Burst shots and retakes of the same moment get grouped into one frame, so a trip's worth of
  // "same spot, five photos" reads as one nice tile instead of five near-duplicates in a row.
  async function proceedFromPick() {
    if (!picks.length || reading || scanning) return;
    setScanning(true);
    try {
      const hashes = new Map<string, string | null>();
      await Promise.all(picks.map(async p => { hashes.set(p.id, await hashImage(p.url)); }));
      const groups = groupDuplicates(picks, hashes);
      const merged = await Promise.all(groups.map(g => g.length > 1 ? composeGroup(g) : Promise.resolve(g[0])));
      setPicks(merged.sort((a, b) => a.taken - b.taken));
      setGrouped(groups.filter(g => g.length > 1).length);
      setStep('preview');
    } finally { setScanning(false); }
  }

  // One chapter per day (busy days split into chapters of up to eight), each with a ready-made line.
  const days = useMemo<Day[]>(() => {
    const out: Day[] = [];
    for (const p of picks) {
      const key = dayKey(p.taken), last = out[out.length - 1];
      if (last && last.key === key && last.picks.length < PER_CHAPTER) last.picks.push(p);
      else out.push({ key, picks: [p], note: '' });
    }
    return out.map((d, i) => ({ ...d, note: i === 0 && note.trim() ? note.trim() : STAMPS[locale][i % STAMPS[locale].length] }));
  }, [picks, note, locale]);
  const dayCount = new Set(days.map(d => d.key)).size;
  const first = days[0]?.key || editItem?.day || todayKey, last = days[days.length - 1]?.key || first;
  const month = Number(first.slice(5, 7));
  const autoTitle = dayCount > 1 ? t(`${month}월의 ${dayCount - 1}박 ${dayCount}일`, `${dayCount} days together`) : t(`${month}월 ${Number(first.slice(8))}일, 우리`, 'Our little day');
  const title = editItem ? name.trim() : name.trim() || autoTitle;
  const items = useMemo<MemoryItem[]>(() => days.map((d, i) => ({
    id: `quick-${i}`, kind: 'record', body: d.note, day: d.key, shared: true, mine: true, author: '', revision: 0, updatedAt: '',
    photos: d.picks.map(p => ({ id: p.id, kind: 'photo' as const, body: '', src: p.url, day: d.key, created: p.taken, shared: true, mine: true, author: '', revision: 0, updatedAt: '', mediaType: p.video ? 'video' : 'image' })),
  })), [days]);

  async function save() {
    if (saving || accepted === null || (!picks.length && !editItem)) return;
    if (!accepted && !consent) { setShowConsent(true); return; }
    setError('');
    try {
      if (!accepted) { setSaving(t('약관 확인 중…', 'Confirming…')); await api('/api/policy', { method: 'POST', body: JSON.stringify({ version: TERMS_VERSION, accepted: true }) }); setAccepted(true); }
      if (editItem) {
        const fresh = picks.filter((p): p is Pick & { file: File } => Boolean(p.file));
        let sent = 0;
        await mapLimit(fresh, 2, async p => {
          const form = new FormData();
          form.set('id', p.id); form.set('folderId', editItem.folderId); form.set('file', p.file, p.file.name); form.set('name', p.file.name);
          form.set('created', String(p.taken)); form.set('shared', String(editItem.shared)); form.set('recipients', JSON.stringify(editItem.recipients));
          await api('/api/photos', { method: 'POST', body: form });
          sent++; setSaving(t(`사진 올리는 중 ${sent}/${fresh.length}`, `Uploading ${sent}/${fresh.length}`));
        });
        setSaving(t('수정 내용 저장 중…', 'Saving changes…'));
        await api('/api/memories', { method: 'PATCH', body: JSON.stringify({ id: editItem.id, revision: editItem.revision, title: title.slice(0, 120), body: note, day: first, shared: editItem.shared, recipients: editItem.recipients, photoIds: picks.map(p => p.id) }) });
        onSaved(editItem.folderId);
        return;
      }
      setSaving(t('앨범 만드는 중…', 'Creating album…'));
      const { id: folderId } = await api<{ id: string }>('/api/folders', { method: 'POST', body: JSON.stringify({ name: title, category: dayCount > 1 ? '여행' : '모임', description: note.trim().slice(0, 200), startDate: first, endDate: last, groupId, decoration: studioStickers.length ? { stickers: studioStickers } : undefined }) });
      const uploaded = new Set<string>();
      let sent = 0;
      // 2 at once, not strictly one-by-one — the server caps staged uploads at 2 concurrent
      // sessions per viewer (app/api/photos/uploads/route.ts), so this is as fast as it gets.
      await mapLimit(picks.filter((p): p is Pick & { file: File } => Boolean(p.file)), 2, async p => {
        const form = new FormData();
        form.set('id', p.id); form.set('folderId', folderId); form.set('file', p.file, p.file.name); form.set('name', p.file.name);
        form.set('created', String(p.taken)); form.set('shared', 'true');
        try { await api('/api/photos', { method: 'POST', body: form }); uploaded.add(p.id); } catch { /* Keep going; the album still saves what made it. */ }
        finally { sent++; setSaving(t(`사진 올리는 중 ${sent}/${picks.length}`, `Uploading ${sent}/${picks.length}`)); }
      });
      if (!uploaded.size) throw new Error('UPLOAD_FAILED');
      for (const d of days) {
        const photoIds = d.picks.map(p => p.id).filter(id => uploaded.has(id));
        if (photoIds.length) await api('/api/memories', { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), folderId, title: '', body: d.note, day: d.key, shared: true, photoIds }) }).catch(() => {});
      }
      // Persist the preview theme for invited friends as well as this browser.
      try { const picked = localStorage.getItem('memonestia-album-theme:quick-preview'); if (picked) { await api('/api/folders', { method: 'PUT', body: JSON.stringify({ action: 'style', id: folderId, theme: picked }) }); localStorage.setItem('memonestia-album-theme:' + folderId, picked); localStorage.removeItem('memonestia-album-theme:quick-preview'); } } catch {}
      onSaved(folderId);
    } catch { setError(t('저장하지 못했어요. 연결을 확인하고 다시 눌러 주세요.', 'Could not save. Check your connection and try again.')); }
    finally { setSaving(''); }
  }

  return createPortal(<div className="qa-screen" role="dialog" aria-modal="true" aria-label={editItem ? t('기록 수정', 'Edit memory') : t('새 앨범 만들기', 'Create a new album')}>
    <header className="qa-top">
      {step === 'pick' ? <button aria-label={t('닫기', 'Close')} onClick={onClose}><X size={20} /></button> : <button aria-label={t('뒤로', 'Back')} onClick={() => setStep(step === 'note' ? 'preview' : 'pick')}><ArrowLeft size={20} /></button>}
      <strong className="qa-title">{editItem ? t('기록 수정', 'Edit Memory') : t('앨범 만들기', 'Create Album')}</strong>
      <ol aria-label={t('단계', 'Steps')}>{(['pick', 'preview'] as const).map((s, i) => <li key={s} className={s === step || (s === 'preview' && step === 'note') ? 'is-on' : ''}>{i + 1}</li>)}</ol>
    </header>

    {step === 'pick' && <section className="qa-body">
      <div className="qa-crew-card"><span className="qa-crew-lock">⌑</span><span><b>{(groupId ? crewMeta?.name : null) || (groupId ? t('선택한 크루', 'Selected crew') : t('내 공간', 'My space'))}</b><small>{groupId ? t('저장하면 크루 멤버에게 공유돼요', 'Shared with crew members when saved') : t('초대 전에는 나만, 초대 후에는 앨범 멤버와 공유', 'Only you until you invite others; then shared with album members')}</small></span><i>{groupId ? t('크루 공유', 'Crew') : t('초대형 앨범', 'Invite-only')}</i></div>
      <span className="qa-eyebrow">{editItem ? t('기존 기록 수정 중', 'EDITING A MEMORY') : t('새 추억 보관함 생성 중', 'A NEW MEMORY ALBUM')}</span>
      <h2>{editItem ? t('앨범 이름과 사진을 확인해 주세요', 'Check the title and photos') : t('함께 찍은 사진 몇 장이면 충분해요', 'A few photos are all you need')}</h2>
      <p>{t('사진을 고르면 날짜와 한 줄을 담아 앨범으로 꾸며드려요. 이름과 꾸미기는 나중에 바꿔도 돼요.', 'Choose photos for an album with dates and captions. Change the title and decorations later.')}</p>
      <div className="qa-photo-heading"><span><b>{editItem ? t('현재 기록 사진', 'Current photos') : t('함께 남길 사진', 'Photos to keep')}</b><small>{picks.length}{t('장 선택됨', ' selected')}</small></span><small>{t(`최대 ${MAX_PHOTOS}장`, `Up to ${MAX_PHOTOS}`)}</small></div>
      <div className="qa-sources">
        <label className="qa-source"><ImagePlus size={26} /><strong>{t('앨범에서 여러 장 고르기', 'Choose photos')}</strong><input type="file" accept="image/*,.heic,.heif" multiple onChange={e => { void add(Array.from(e.target.files || [])); e.target.value = ''; }} /></label>
        <label className="qa-source"><Camera size={26} /><strong>{t('사진 찍기', 'Take a photo')}</strong><input type="file" accept="image/*" capture="environment" onChange={e => { void add(Array.from(e.target.files || [])); e.target.value = ''; }} /></label>
      </div>
      {picks.length > 0 && <p className="qa-days">{dayCount > 1 ? t(`${dayCount}일에 걸친 사진 ${picks.length}장 · 날짜별로 나눠 둘게요`, `${picks.length} photos over ${dayCount} days, sorted by day`) : t(`사진 ${picks.length}장`, `${picks.length} photos`)}</p>}
      {picks.length > 0 && <div className="qa-thumbs">{picks.map((p,i) => <span key={p.id}><img src={p.url} alt="" />{i===0&&<b className="qa-cover-badge">★ {t('대표 커버','Cover')}</b>}<button aria-label={t('빼기', 'Remove')} onClick={() => remove(p.id)}>×</button></span>)}</div>}
      {!picks.length && !reading && <button className="qa-sample" onClick={() => void addSamples()}>{t('사진이 없으면 샘플 사진으로 먼저 해보기', 'No photos handy? Try it with sample photos')}</button>}
      {!picks.length && !reading && onBlank && <button className="qa-sample qa-blank" onClick={onBlank}>{t('사진 없이 빈 앨범부터 만들기', 'Start an empty album instead')}</button>}
      {error && <p className="qa-error" role="alert">{error}</p>}
      <div className="qa-dock"><button className="qa-primary" disabled={!picks.length || reading || scanning} onClick={() => editItem ? setStep('preview') : void proceedFromPick()}>{reading ? t('찍은 날짜 읽는 중…', 'Reading dates…') : scanning ? t('비슷한 사진 찾는 중…', 'Checking for similar shots…') : picks.length ? t(`${picks.length}장의 조각으로 앨범 미리보기`, `Preview album with ${picks.length} photos`) : t('사진을 골라 주세요', 'Choose some photos')}<ArrowRight size={18} /></button></div>
    </section>}

    {step === 'note' && <section className="qa-body">
      <h2>{editItem ? t('이 기록의 내용을 고쳐 볼까요?', 'Edit this memory') : t('제목과 한 줄을 바꿔 볼까요?', 'Change the title or the first line?')}</h2>
      <p>{editItem ? t('기존 사진과 내용을 불러왔어요. 저장하면 이 기록에 반영돼요.', 'The current photos and text are loaded. Saving updates this memory.') : t('비워 두면 자동으로 채운 그대로 둘게요.', 'Leave them empty to keep what we filled in.')}</p>
      <label className="qa-field">{t('앨범 이름', 'Album name')}<input maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder={autoTitle} /></label>
      <label className="qa-field">{t('첫 장의 한 줄', 'First page line')}<textarea maxLength={editItem ? 4000 : 120} rows={editItem ? 5 : 2} value={note} onChange={e => setNote(e.target.value)} placeholder={STAMPS[locale][0]} /></label>
      {editItem && <><p className="qa-photo-heading"><b>현재 기록 사진 · {picks.length}장</b></p><div className="qa-thumbs">{picks.map(p=><span key={p.id}>{p.video?<video src={p.url} muted playsInline/>:<img src={p.url} alt=""/>}<button aria-label="사진 빼기" onClick={()=>remove(p.id)}>×</button></span>)}</div></>}
      <div className="qa-dock"><button className="qa-primary" onClick={() => setStep('preview')}>{editItem ? t('미리보기', 'Preview changes') : t('앨범으로 돌아가기', 'Back to the album')}<ArrowRight size={18} /></button></div>
    </section>}

    {step === 'preview' && <section className="qa-body qa-preview">
      <div className="qa-edit-bar"><span>{dayCount > 1 ? t(`${dayCount}일로 나눠 꾸몄어요`, `Sorted into ${dayCount} days`) : t('자동으로 꾸몄어요', 'Decorated for you')}</span><button onClick={() => setStep('note')}><PencilLine size={14} />{t('제목·한 줄 바꾸기', 'Edit title & line')}</button></div>
      <ThemeAlbum folderId="quick-preview" title={title} description="" locale={locale} browsing={false} localItems={items} onPhoto={() => {}} />
      {!editItem && <details className="qa-studio" aria-label={t('앨범 꾸미기', 'Decorate album')}>
        <summary>{t('스티커로 더 꾸미기 (선택)', 'Add stickers (optional)')}</summary>
        <div className="qa-studio-title"><span>✦</span><div><small>{t('앨범 생성 전에 바로 꾸며요', 'DECORATE BEFORE SAVING')}</small><strong>{t('다꾸 스튜디오', 'Sticker studio')}</strong><p>{t('스티커·이모지·사운드콘을 사진에 붙여 원하는 곳에 놓아보세요.', 'Add stickers, emoji and sound-con reactions to your cover photo.')}</p></div></div>
        <div className="qa-studio-stage" ref={studioStage} onPointerMove={moveStudioSticker} onPointerUp={() => { studioDragging.current = null; }} onPointerCancel={() => { studioDragging.current = null; }}>
          {picks.find(p => !p.video) ? <img src={picks.find(p => !p.video)!.url} alt="" draggable={false}/> : <div className="qa-studio-empty">{t('앨범 사진을 고르면 표지가 여기에 보여요.', 'Choose photos to preview the album cover.')}</div>}
          {studioStickers.map(item => { const art = STUDIO_STICKERS.find(sticker => sticker.id === item.sticker)!; const copy = STUDIO_STICKER_COPY[item.sticker]; const bubble = item.sticker.startsWith('bubble-'); return <button type="button" key={item.id} aria-label={t(`${copy.title} 이동`, `Move ${copy.title}`)} aria-pressed={selectedStudioSticker === item.id} className={`qa-studio-sticker${bubble ? ' qa-studio-bubble' : ''}${selectedStudioSticker === item.id ? ' is-selected' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%`, fontSize: `${item.size}px`, transform: `translate(-50%,-50%) rotate(${item.rotation}deg)` }} onPointerDown={event => { event.preventDefault(); studioDragging.current = item.id; setSelectedStudioSticker(item.id); event.currentTarget.parentElement?.setPointerCapture(event.pointerId); }} onClick={() => setSelectedStudioSticker(item.id)}><span>{art.emoji}</span><b>{copy.title}</b>{bubble && <small>{copy.caption}</small>}</button>; })}
        </div>
        <p className="qa-studio-hint">{t('스티커를 길게 눌러 사진 위 원하는 위치로 끌고, 크기도 조절해 보세요!', 'Press and drag a sticker onto the photo, then adjust its size.')}</p>
        <div className="qa-studio-tabs" role="group" aria-label={t('스티커 카테고리', 'Sticker categories')}>
          {STUDIO_CATEGORIES.map(item => <button type="button" key={item.id} aria-pressed={studioTab === item.id} onClick={() => setStudioTab(item.id)}>{item.label}</button>)}
        </div>
        <div className="qa-studio-palette">{STUDIO_STICKERS.filter(item => STUDIO_STICKER_COPY[item.id]?.category === studioTab).map(item => <button type="button" key={item.id} title={item.name} disabled={studioStickers.length >= 12} onClick={() => addStudioSticker(item)}><span>{item.emoji}</span><b>{STUDIO_STICKER_COPY[item.id].title}</b><small>{STUDIO_STICKER_COPY[item.id].caption}</small></button>)}</div>
        <div className="qa-studio-combo"><strong>♡ {t('감정 콤보 스티커', 'Mood stickers')}</strong><span>{t(`내가 고른 ${studioStickers.length}개`, `${studioStickers.length} selected`)}</span><div>{['💗','🥐','🤣','🔥','💸'].map((emoji,index)=>{ const stickerId = ['heart','croissant','laugh','fire','money'][index]; const count = studioStickers.filter(item => item.sticker === stickerId).length; return <button type="button" key={emoji} aria-label={t(`${emoji} 이모지 추가`, `Add ${emoji}`)} onClick={()=>addStudioSticker(STUDIO_STICKERS.find(item=>item.id===stickerId)!)}>{emoji}<small>{count}</small></button>; })}</div></div>
        {selectedStudioSticker && <div className="qa-studio-adjust"><label>{t('스티커 크기', 'Sticker size')}<input type="range" min="24" max="88" value={studioStickers.find(item => item.id === selectedStudioSticker)?.size ?? 40} onChange={event => setStudioStickers(old => old.map(item => item.id === selectedStudioSticker ? { ...item, size: Number(event.target.value) } : item))}/></label><button type="button" onClick={() => { setStudioStickers(old => old.filter(item => item.id !== selectedStudioSticker)); setSelectedStudioSticker(null); }}>{t('선택 삭제', 'Remove')}</button></div>}
        {studioStickers.length >= 12 && <p className="qa-studio-limit">{t('앨범 하나에 꾸미기 요소를 최대 12개까지 넣을 수 있어요.', 'Up to 12 decorations per album.')}</p>}
      </details>}
      {grouped > 0 && <p className="qa-days">{t(`비슷한 사진은 한 장으로 예쁘게 묶었어요 (${grouped}곳)`, `Grouped similar shots into one frame (${grouped})`)}</p>}
      <p className="qa-audience">{editItem ? t('기존 기록의 공개 범위를 유지해요.', 'This keeps the memory’s existing audience.') : groupId ? t('저장하면 크루 멤버가 사진과 한마디를 볼 수 있어요.', 'Crew members can see these photos and captions once saved.') : t('저장한 뒤 친구를 초대하면 함께 볼 수 있어요. 초대 링크를 가진 사람은 공유된 사진을 보고 참여할 수 있어요.', 'After saving, invite friends to view it together. Anyone with the invite link can see shared photos and join.')}</p>
      <div className="qa-dock">
        {showConsent && accepted === false && <Consent ko={ko} checked={consent} onChange={setConsent} />}
        {error && <p className="qa-error" role="alert">{error}</p>}
        <button className="qa-primary" disabled={!!saving || accepted === null || (showConsent && !accepted && !consent) || (!picks.length && !editItem)} onClick={() => void save()}>{saving || (editItem ? t('수정 사항 저장하기', 'Save changes') : t('이 앨범 저장하기', 'Keep this album'))}<ArrowRight size={18} /></button>
        <small>{editItem ? t('사진을 빼면 이 기록에서 숨김 처리돼요.', 'Removed photos are hidden from this memory.') : t('저장하면 링크 하나로 친구들이 가입 없이 사진과 한마디를 얹을 수 있어요.', 'Once saved, friends can add photos and a note from one link, no sign-up needed.')}</small>
      </div>
    </section>}
  </div>, document.body);
}
