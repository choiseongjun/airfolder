'use client';
/* eslint-disable @next/next/no-img-element -- Thumbnails are local object URLs of photos not uploaded yet. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Camera, ImagePlus, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { IMAGE_LIMIT } from '@/lib/media-limits';
import { TERMS_VERSION } from '@/lib/policy';
import ThemeAlbum from './theme-album';
import type { MemoryItem } from './memories';
import Consent from './growth/consent';
import './quick-album.css';

type Pick = { id: string; file: File; url: string };
const SAMPLES = ['/explore/photo-0.jpg', '/explore/photo-5.jpg', '/explore/photo-11.jpg', '/explore/photo-28.jpg', '/explore/photo-32.jpg', '/explore/photo-36.jpg'];
const today = () => new Date().toISOString().slice(0, 10);

/** The first-visit path: pick or shoot photos, see them decorated right away, then keep the album. */
export default function QuickAlbum({ locale, onClose, onSaved }: { locale: 'ko' | 'en'; onClose: () => void; onSaved: (folderId: string) => void }) {
  const ko = locale === 'ko', t = (a: string, b: string) => ko ? a : b;
  const [step, setStep] = useState<'pick' | 'note' | 'preview'>('pick');
  const [picks, setPicks] = useState<Pick[]>([]), [name, setName] = useState(''), [note, setNote] = useState('');
  const [accepted, setAccepted] = useState<boolean | null>(null), [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(''), [error, setError] = useState('');
  const urls = useRef<string[]>([]);
  useEffect(() => { let active = true; api<{ accepted: boolean }>('/api/policy').then(p => { if (active) setAccepted(p.accepted); }).catch(() => { if (active) setAccepted(false); }); return () => { active = false; }; }, []);
  useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), []);
  useEffect(() => { const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = overflow; }; }, []);

  function add(files: File[]) {
    const room = 12 - picks.length;
    const fresh = files.filter(f => f.size && f.size <= IMAGE_LIMIT && (f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name))).slice(0, room)
      .map(file => { const url = URL.createObjectURL(file); urls.current.push(url); return { id: crypto.randomUUID(), file, url }; });
    if (fresh.length) setPicks(old => [...old, ...fresh]);
    if (files.length > fresh.length) setError(t('사진은 12장, 장당 20MB까지 담을 수 있어요.', 'Up to 12 photos, 20 MB each.')); else setError('');
  }
  async function addSamples() {
    try { add(await Promise.all(SAMPLES.map(async (src, i) => new File([await (await fetch(src)).blob()], `sample-${i + 1}.jpg`, { type: 'image/jpeg' })))); }
    catch { setError(t('샘플 사진을 불러오지 못했어요.', 'Could not load the sample photos.')); }
  }
  function remove(id: string) { setPicks(old => old.filter(p => p.id !== id)); }

  const title = name.trim() || t('우리의 하루', 'Our little day');
  // Four photos per chapter reads well in every theme; the note leads the first chapter.
  const items = useMemo<MemoryItem[]>(() => {
    const day = today(), out: MemoryItem[] = [];
    for (let i = 0; i < picks.length; i += 4) out.push({ id: `quick-${i}`, kind: 'record', body: i === 0 ? note.trim() : '', day, shared: true, mine: true, author: '', revision: 0, updatedAt: '',
      photos: picks.slice(i, i + 4).map(p => ({ id: p.id, kind: 'photo' as const, body: '', src: p.url, day, shared: true, mine: true, author: '', revision: 0, updatedAt: '', mediaType: 'image' })) });
    return out;
  }, [picks, note]);

  async function save() {
    if (saving || !picks.length || (!accepted && !consent)) return;
    setError('');
    try {
      if (!accepted) { setSaving(t('약관 확인 중…', 'Confirming…')); await api('/api/policy', { method: 'POST', body: JSON.stringify({ version: TERMS_VERSION, accepted: true }) }); setAccepted(true); }
      setSaving(t('앨범 만드는 중…', 'Creating album…'));
      const { id: folderId } = await api<{ id: string }>('/api/folders', { method: 'POST', body: JSON.stringify({ name: title, category: '모임', description: note.trim().slice(0, 200) }) });
      const ids: string[] = [];
      for (const [i, p] of picks.entries()) {
        setSaving(t(`사진 올리는 중 ${i + 1}/${picks.length}`, `Uploading ${i + 1}/${picks.length}`));
        const form = new FormData();
        form.set('id', p.id); form.set('folderId', folderId); form.set('file', p.file, p.file.name); form.set('name', p.file.name);
        form.set('created', String(Math.min(p.file.lastModified || Date.now(), Date.now()))); form.set('shared', 'true');
        try { await api('/api/photos', { method: 'POST', body: form }); ids.push(p.id); } catch { /* Keep going; the album still saves what made it. */ }
      }
      if (!ids.length) throw new Error('UPLOAD_FAILED');
      if (note.trim()) await api('/api/memories', { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), folderId, title: '', body: note.trim(), day: today(), shared: true, photoIds: ids }) }).catch(() => {});
      // Keep the theme they picked in the preview.
      try { const picked = localStorage.getItem('memonestia-album-theme:quick-preview'); if (picked) { localStorage.setItem('memonestia-album-theme:' + folderId, picked); localStorage.removeItem('memonestia-album-theme:quick-preview'); } } catch {}
      onSaved(folderId);
    } catch { setError(t('저장하지 못했어요. 연결을 확인하고 다시 눌러 주세요.', 'Could not save. Check your connection and try again.')); }
    finally { setSaving(''); }
  }

  return createPortal(<div className="qa-screen" role="dialog" aria-modal="true" aria-label={t('사진으로 앨범 만들기', 'Make an album from photos')}>
    <header className="qa-top">
      {step === 'pick' ? <button aria-label={t('닫기', 'Close')} onClick={onClose}><X size={20} /></button> : <button aria-label={t('뒤로', 'Back')} onClick={() => setStep(step === 'preview' ? 'note' : 'pick')}><ArrowLeft size={20} /></button>}
      <ol aria-label={t('단계', 'Steps')}>{(['pick', 'note', 'preview'] as const).map((s, i) => <li key={s} className={s === step ? 'is-on' : ''}>{i + 1}</li>)}</ol>
      <span />
    </header>

    {step === 'pick' && <section className="qa-body">
      <h2>{t('사진 몇 장이면 충분해요', 'A few photos are enough')}</h2>
      <p>{t('고르거나 지금 찍어 보세요. 다음 화면에서 바로 꾸며진 앨범으로 보여드려요.', 'Choose or take some now. You will see them as a decorated album on the next screen.')}</p>
      <div className="qa-sources">
        <label className="qa-source"><Camera size={26} /><strong>{t('사진 찍기', 'Take a photo')}</strong><input type="file" accept="image/*" capture="environment" onChange={e => { add(Array.from(e.target.files || [])); e.target.value = ''; }} /></label>
        <label className="qa-source"><ImagePlus size={26} /><strong>{t('앨범에서 고르기', 'Choose photos')}</strong><input type="file" accept="image/*,.heic,.heif" multiple onChange={e => { add(Array.from(e.target.files || [])); e.target.value = ''; }} /></label>
      </div>
      {picks.length > 0 && <div className="qa-thumbs">{picks.map(p => <span key={p.id}><img src={p.url} alt="" /><button aria-label={t('빼기', 'Remove')} onClick={() => remove(p.id)}>×</button></span>)}</div>}
      {!picks.length && <button className="qa-sample" onClick={() => void addSamples()}>{t('사진이 없으면 샘플 사진으로 먼저 해보기', 'No photos handy? Try it with sample photos')}</button>}
      {error && <p className="qa-error" role="alert">{error}</p>}
      <div className="qa-dock"><button className="qa-primary" disabled={!picks.length} onClick={() => setStep('note')}>{picks.length ? t(`사진 ${picks.length}장으로 계속`, `Continue with ${picks.length}`) : t('사진을 골라 주세요', 'Choose some photos')}<ArrowRight size={18} /></button></div>
    </section>}

    {step === 'note' && <section className="qa-body">
      <h2>{t('어떤 날이었나요?', 'What was the day?')}</h2>
      <p>{t('비워 둬도 괜찮아요. 한 줄이 있으면 손글씨로 들어가요.', 'Both are optional. A line of text goes in as handwriting.')}</p>
      <label className="qa-field">{t('앨범 이름', 'Album name')}<input maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder={t('예: 비 오던 날의 제주', 'e.g. A rainy day in Jeju')} /></label>
      <label className="qa-field">{t('한 줄 메모', 'One line')}<textarea maxLength={120} rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder={t('예: 우산 하나에 다섯 명', 'e.g. Five of us under one umbrella')} /></label>
      <div className="qa-dock"><button className="qa-primary" onClick={() => setStep('preview')}>{t('꾸민 앨범 보기', 'See it decorated')}<ArrowRight size={18} /></button></div>
    </section>}

    {step === 'preview' && <section className="qa-body qa-preview">
      <ThemeAlbum folderId="quick-preview" title={title} description="" locale={locale} browsing={false} localItems={items} onPhoto={() => {}} />
      <div className="qa-dock">
        {accepted === false && <Consent ko={ko} checked={consent} onChange={setConsent} />}
        {error && <p className="qa-error" role="alert">{error}</p>}
        <button className="qa-primary" disabled={!!saving || accepted === null || (!accepted && !consent)} onClick={() => void save()}>{saving || t('이 앨범 저장하기', 'Keep this album')}<ArrowRight size={18} /></button>
        <small>{t('저장하면 친구를 초대해 같이 채울 수 있어요.', 'Once saved, invite friends to fill it in together.')}</small>
      </div>
    </section>}
  </div>, document.body);
}
