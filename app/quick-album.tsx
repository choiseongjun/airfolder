'use client';
/* eslint-disable @next/next/no-img-element -- Thumbnails are local object URLs of photos not uploaded yet. */
import { useEffect, useMemo, useRef, useState } from 'react';
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
import './quick-album.css';

type Pick = { id: string; file: File; url: string; taken: number };
type Day = { key: string; picks: Pick[]; note: string };
const MAX_PHOTOS = 30, PER_CHAPTER = 8;
const SAMPLES = ['/explore/photo-0.jpg', '/explore/photo-5.jpg', '/explore/photo-11.jpg', '/explore/photo-28.jpg', '/explore/photo-32.jpg', '/explore/photo-36.jpg'];
// Ready-made handwritten lines, so nobody has to type anything for the album to feel finished.
const STAMPS = {
  ko: ['함께여서 좋았던 날 ♡', '오늘의 우리, 맑음', '배부르고 행복했던 순간', '이 장면은 꼭 남겨야 해', '돌아가고 싶은 그 시간', '웃음이 끊이지 않던 하루'],
  en: ['the good little days ♡', 'us, sunny all day', 'full and happy', 'this one we keep', 'take me back here', 'we never stopped laughing'],
};
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
export default function QuickAlbum({ locale, onClose, onSaved, onBlank, groupId = null }: { locale: 'ko' | 'en'; onClose: () => void; onSaved: (folderId: string) => void; onBlank?: () => void; groupId?: string | null }) {
  const ko = locale === 'ko', t = (a: string, b: string) => ko ? a : b;
  const [step, setStep] = useState<'pick' | 'preview' | 'note'>('pick');
  const [picks, setPicks] = useState<Pick[]>([]), [reading, setReading] = useState(false), [name, setName] = useState(''), [note, setNote] = useState(''), [firstComment, setFirstComment] = useState(''), [withRollingPaper, setWithRollingPaper] = useState(true);
  const [crewMeta, setCrewMeta] = useState<{name: string; members: number} | null>(null);
  const [scanning, setScanning] = useState(false), [grouped, setGrouped] = useState(0);
  const [accepted, setAccepted] = useState<boolean | null>(null), [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(''), [error, setError] = useState('');
  const urls = useRef<string[]>([]), [todayKey] = useState(() => dayKey(Date.now()));
  useEffect(() => { let active = true; api<{ accepted: boolean }>('/api/policy').then(p => { if (active) setAccepted(p.accepted); }).catch(() => { if (active) setAccepted(false); }); return () => { active = false; }; }, []);
  useEffect(() => { if (!groupId) { setCrewMeta(null); return; } let active = true; api<{crew: {name: string | null; members: unknown[]}}>(`/api/feed?group=${encodeURIComponent(groupId)}`).then(data => { if (active) setCrewMeta({name: data.crew.name || t('우리 크루', 'Our crew'), members: data.crew.members.length}); }).catch(() => { if (active) setCrewMeta({name: t('선택한 크루', 'Selected crew'), members: 1}); }); return () => { active = false; }; }, [groupId, locale]);
  useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), []);
  useEffect(() => { const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = overflow; }; }, []);

  async function add(files: File[], times?: number[]) {
    const room = MAX_PHOTOS - picks.length;
    const usable = files.filter(f => f.size && f.size <= IMAGE_LIMIT && (f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name))).slice(0, room);
    setError(files.length > usable.length ? t(`사진은 ${MAX_PHOTOS}장, 장당 20MB까지 담을 수 있어요.`, `Up to ${MAX_PHOTOS} photos, 20 MB each.`) : '');
    if (!usable.length) return;
    setReading(true);
    const fresh = await Promise.all(usable.map(async (file, i) => {
      const url = URL.createObjectURL(file); urls.current.push(url);
      return { id: crypto.randomUUID(), file, url, taken: times?.[i] ?? await takenAt(file) };
    }));
    setPicks(old => [...old, ...fresh].sort((a, b) => a.taken - b.taken));
    setReading(false);
  }
  async function addSamples() {
    try {
      const files = await Promise.all(SAMPLES.map(async (src, i) => new File([await (await fetch(src)).blob()], `sample-${i + 1}.jpg`, { type: 'image/jpeg' })));
      // Sample photos carry no camera time, so spread them over a two-day trip to show the day split.
      const start = new Date(); start.setDate(start.getDate() - 2); start.setHours(10, 20, 0, 0);
      await add(files, [0, 200, 465, 1450, 1630, 1805].map(min => start.getTime() + min * 60000));
    } catch { setError(t('샘플 사진을 불러오지 못했어요.', 'Could not load the sample photos.')); setReading(false); }
  }
  function remove(id: string) { setPicks(old => old.filter(p => p.id !== id)); }

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
  const first = days[0]?.key || todayKey, last = days[days.length - 1]?.key || first;
  const month = Number(first.slice(5, 7));
  const autoTitle = dayCount > 1 ? t(`${month}월의 ${dayCount - 1}박 ${dayCount}일`, `${dayCount} days together`) : t(`${month}월 ${Number(first.slice(8))}일, 우리`, 'Our little day');
  const title = name.trim() || autoTitle;
  const items = useMemo<MemoryItem[]>(() => days.map((d, i) => ({
    id: `quick-${i}`, kind: 'record', body: d.note, day: d.key, shared: true, mine: true, author: '', revision: 0, updatedAt: '',
    photos: d.picks.map(p => ({ id: p.id, kind: 'photo' as const, body: '', src: p.url, day: d.key, created: p.taken, shared: true, mine: true, author: '', revision: 0, updatedAt: '', mediaType: 'image' })),
  })), [days]);

  async function save() {
    if (saving || !picks.length || (!accepted && !consent)) return;
    setError('');
    try {
      if (!accepted) { setSaving(t('약관 확인 중…', 'Confirming…')); await api('/api/policy', { method: 'POST', body: JSON.stringify({ version: TERMS_VERSION, accepted: true }) }); setAccepted(true); }
      setSaving(t('앨범 만드는 중…', 'Creating album…'));
      const { id: folderId } = await api<{ id: string }>('/api/folders', { method: 'POST', body: JSON.stringify({ name: title, category: dayCount > 1 ? '여행' : '모임', description: note.trim().slice(0, 200), startDate: first, endDate: last, groupId }) });
      const uploaded = new Set<string>();
      let sent = 0;
      // 2 at once, not strictly one-by-one — the server caps staged uploads at 2 concurrent
      // sessions per viewer (app/api/photos/uploads/route.ts), so this is as fast as it gets.
      await mapLimit(picks, 2, async p => {
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
      if (withRollingPaper && firstComment.trim() && picks[0] && uploaded.has(picks[0].id)) await api('/api/discussion', { method: 'POST', body: JSON.stringify({ kind: 'photo', targetId: picks[0].id, action: 'comment', id: crypto.randomUUID(), body: firstComment.trim() }) }).catch(() => {});
      // Keep the theme they picked in the preview.
      try { const picked = localStorage.getItem('memonestia-album-theme:quick-preview'); if (picked) { localStorage.setItem('memonestia-album-theme:' + folderId, picked); localStorage.removeItem('memonestia-album-theme:quick-preview'); } } catch {}
      onSaved(folderId);
    } catch { setError(t('저장하지 못했어요. 연결을 확인하고 다시 눌러 주세요.', 'Could not save. Check your connection and try again.')); }
    finally { setSaving(''); }
  }

  return createPortal(<div className="qa-screen" role="dialog" aria-modal="true" aria-label={t('새 앨범 만들기', 'Create a new album')}>
    <header className="qa-top">
      {step === 'pick' ? <button aria-label={t('닫기', 'Close')} onClick={onClose}><X size={20} /></button> : <button aria-label={t('뒤로', 'Back')} onClick={() => setStep(step === 'note' ? 'preview' : 'pick')}><ArrowLeft size={20} /></button>}
      <strong className="qa-title">{t('앨범 만들기', 'Create Album')}</strong>
      <ol aria-label={t('단계', 'Steps')}>{(['pick', 'preview'] as const).map((s, i) => <li key={s} className={s === step || (s === 'preview' && step === 'note') ? 'is-on' : ''}>{i + 1}</li>)}</ol>
    </header>

    {step === 'pick' && <section className="qa-body">
      <div className="qa-crew-card"><span className="qa-crew-lock">⌑</span><span><b>{crewMeta?.name || t('내 공간', 'My space')}</b><small>{crewMeta ? t(`멤버 ${crewMeta.members}명 · 비공개 보관함`, `${crewMeta.members} members · private album`) : t('나만 볼 수 있는 비공개 보관함', 'A private album only you can see')}</small></span><i>비공개</i></div>
      <span className="qa-eyebrow">{t('새 추억 보관함 생성 중', 'A NEW MEMORY ALBUM')}</span>
      <h2>{t('앨범에 어떤 이름을 붙일까요?', 'What should we call this album?')}</h2>
      <label className="qa-field">{t('앨범 이름', 'Album name')}<input maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder={autoTitle} /></label>
      <div className="qa-date-card"><span className="qa-date-icon">▦</span><span><b>{t('기억된 날짜', 'Memory dates')}</b><small>{picks.length ? `${new Date(first + 'T12:00:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US')}${first !== last ? ` — ${new Date(last + 'T12:00:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US')}` : ''}` : t('사진 촬영일을 읽어 자동으로 정리해요', 'Dates are read from the selected photos')}</small></span><span className="qa-date-auto">EXIF</span></div>
      <div className="qa-theme-note"><span>✦</span><span><b>{t('커버 테마 톤', 'Cover theme')}</b><small>{t('따뜻한 테라코타 · 미리보기에서 변경 가능', 'Warm terracotta · change it in preview')}</small></span><ArrowRight size={16}/></div>
      <div className="qa-photo-heading"><span><b>{t('기록 조각들', 'Photo moments')}</b><small>{picks.length}{t('장 선택됨', ' selected')}</small></span><small>{t(`최대 ${MAX_PHOTOS}장`, `Up to ${MAX_PHOTOS}`)}</small></div>
      <div className="qa-sources">
        <label className="qa-source"><ImagePlus size={26} /><strong>{t('앨범에서 여러 장 고르기', 'Choose photos')}</strong><input type="file" accept="image/*,.heic,.heif" multiple onChange={e => { void add(Array.from(e.target.files || [])); e.target.value = ''; }} /></label>
        <label className="qa-source"><Camera size={26} /><strong>{t('사진 찍기', 'Take a photo')}</strong><input type="file" accept="image/*" capture="environment" onChange={e => { void add(Array.from(e.target.files || [])); e.target.value = ''; }} /></label>
      </div>
      {picks.length > 0 && <p className="qa-days">{dayCount > 1 ? t(`${dayCount}일에 걸친 사진 ${picks.length}장 · 날짜별로 나눠 둘게요`, `${picks.length} photos over ${dayCount} days, sorted by day`) : t(`사진 ${picks.length}장`, `${picks.length} photos`)}</p>}
      {picks.length > 0 && <div className="qa-thumbs">{picks.map((p,i) => <span key={p.id}><img src={p.url} alt="" />{i===0&&<b className="qa-cover-badge">★ {t('대표 커버','Cover')}</b>}<button aria-label={t('빼기', 'Remove')} onClick={() => remove(p.id)}>×</button></span>)}</div>}
      {!picks.length && !reading && <button className="qa-sample" onClick={() => void addSamples()}>{t('사진이 없으면 샘플 사진으로 먼저 해보기', 'No photos handy? Try it with sample photos')}</button>}
      {!picks.length && !reading && onBlank && <button className="qa-sample qa-blank" onClick={onBlank}>{t('사진 없이 빈 앨범부터 만들기', 'Start an empty album instead')}</button>}
      <section className="qa-rolling-card"><div className="qa-rolling-head"><span><b>{t('첫 장 뒷면 롤링페이퍼', 'First photo’s rolling paper')}</b><small>{t('첫 코멘트를 앨범 첫 사진 뒷면에 남겨요.', 'Add a first note to the back of your cover photo.')}</small></span><button type="button" role="switch" aria-checked={withRollingPaper} onClick={() => setWithRollingPaper(v => !v)} className={`qa-switch ${withRollingPaper?'is-on':''}`} aria-label={t('첫 롤링페이퍼 코멘트 켜기','Enable first rolling paper note')}><i/></button></div>{withRollingPaper&&<label className="qa-field qa-comment-field"><textarea maxLength={300} rows={2} value={firstComment} onChange={e=>setFirstComment(e.target.value)} placeholder={t('오늘 웨이팅 1시간 한 보람이 있었다 진짜… 뒷면에 후기를 남겨줘!','That one-hour wait was worth it… leave a note on the back!')}/><small>{firstComment.length}/300</small></label>}<small className="qa-rolling-foot">{t('앨범 첫 장 뒷면에 함께 저장돼요.', 'Saved on the back of the first photo.')}</small></section>
      {error && <p className="qa-error" role="alert">{error}</p>}
      <div className="qa-dock"><button className="qa-primary" disabled={!picks.length || reading || scanning} onClick={() => void proceedFromPick()}>{reading ? t('찍은 날짜 읽는 중…', 'Reading dates…') : scanning ? t('비슷한 사진 찾는 중…', 'Checking for similar shots…') : picks.length ? t(`${picks.length}장의 조각으로 앨범 미리보기`, `Preview album with ${picks.length} photos`) : t('사진을 골라 주세요', 'Choose some photos')}<ArrowRight size={18} /></button></div>
    </section>}

    {step === 'note' && <section className="qa-body">
      <h2>{t('제목과 한 줄을 바꿔 볼까요?', 'Change the title or the first line?')}</h2>
      <p>{t('비워 두면 자동으로 채운 그대로 둘게요.', 'Leave them empty to keep what we filled in.')}</p>
      <label className="qa-field">{t('앨범 이름', 'Album name')}<input maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder={autoTitle} /></label>
      <label className="qa-field">{t('첫 장의 한 줄', 'First page line')}<textarea maxLength={120} rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder={STAMPS[locale][0]} /></label>
      <div className="qa-dock"><button className="qa-primary" onClick={() => setStep('preview')}>{t('앨범으로 돌아가기', 'Back to the album')}<ArrowRight size={18} /></button></div>
    </section>}

    {step === 'preview' && <section className="qa-body qa-preview">
      <div className="qa-edit-bar"><span>{dayCount > 1 ? t(`${dayCount}일로 나눠 꾸몄어요`, `Sorted into ${dayCount} days`) : t('자동으로 꾸몄어요', 'Decorated for you')}</span><button onClick={() => setStep('note')}><PencilLine size={14} />{t('제목·한 줄 바꾸기', 'Edit title & line')}</button></div>
      {grouped > 0 && <p className="qa-days">{t(`비슷한 사진은 한 장으로 예쁘게 묶었어요 (${grouped}곳)`, `Grouped similar shots into one frame (${grouped})`)}</p>}
      <ThemeAlbum folderId="quick-preview" title={title} description="" locale={locale} browsing={false} localItems={items} onPhoto={() => {}} />
      <div className="qa-dock">
        {accepted === false && <Consent ko={ko} checked={consent} onChange={setConsent} />}
        {error && <p className="qa-error" role="alert">{error}</p>}
        <button className="qa-primary" disabled={!!saving || accepted === null || (!accepted && !consent)} onClick={() => void save()}>{saving || t('이 앨범 저장하기', 'Keep this album')}<ArrowRight size={18} /></button>
        <small>{t('저장하면 링크 하나로 친구들이 가입 없이 사진과 한마디를 얹을 수 있어요.', 'Once saved, friends can add photos and a note from one link, no sign-up needed.')}</small>
      </div>
    </section>}
  </div>, document.body);
}
