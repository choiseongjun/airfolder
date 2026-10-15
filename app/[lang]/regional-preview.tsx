'use client';

import Image from 'next/image';
import { useState, type CSSProperties } from 'react';
import { Check, Download } from 'lucide-react';
import { regionalCopy, type RegionalLocale } from './regional-copy';
import { cardThemes, type ThemeId } from './memory-card-style';

const photos = ['friends', 'picnic', 'sea'];
export default function RegionalPreview({ locale }: { locale: RegionalLocale }) {
  const t = regionalCopy[locale];
  const [photo, setPhoto] = useState(0);
  const [theme, setTheme] = useState<ThemeId>('cream');
  const [caption, setCaption] = useState<string>(t.caption);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const palette = cardThemes.find(item => item.id === theme)!;
  const save = async () => {
    if (busy) return;
    setBusy(true); setStatus('');
    try {
      const { exportMemoryCard } = await import('./export-memory-card');
      await exportMemoryCard({ frame: 'postcard', theme, photos: [photos[photo]], title: t.cardName, caption, dateLabel: t.cardDate, mastheadLabel: t.region.split(' · ')[1] });
      setStatus(t.saved);
    } catch { setStatus(t.saveError); }
    finally { setBusy(false); }
  };
  return <div className="regional-editor">
    <div className="lp-preview-stage">
      <div className="lp-memory-card lp-memory-card--postcard lp-memory-card--editable" style={{ '--card-paper': palette.paper, '--card-ink': palette.ink } as CSSProperties}>
        <div className="lp-card-masthead"><span>MEMONESTIA</span><span>{t.region.split(' · ')[1]}</span></div>
        <h3>{t.cardName}</h3><div className="lp-card-photos"><div className="lp-card-photo"><Image src={`/landing/${photos[photo]}.webp`} alt={t.photoAlts[photo]} fill sizes="(max-width: 760px) 80vw, 330px" /></div></div>
        <p>{caption || '\u00a0'}</p><span className="lp-card-date">{t.cardDate}</span>
      </div>
    </div>
    <div className="regional-editor-tools">
      <h3>{t.choosePhoto}</h3><div className="lp-photo-picks" role="group" aria-label={t.choosePhoto}>{photos.map((name, i) => <button type="button" key={name} aria-label={t.photoNames[i]} aria-pressed={photo === i} onClick={() => { setPhoto(i); setStatus(''); }}><Image src={`/landing/${name}.webp`} alt="" fill sizes="110px" />{photo === i && <Check size={16} />}</button>)}</div>
      <h3>{t.chooseColor}</h3><div className="lp-theme-swatches" role="group" aria-label={t.chooseColor}>{cardThemes.map((item, i) => <button type="button" key={item.id} aria-label={t.colors[i]} aria-pressed={theme === item.id} style={{ backgroundColor: item.paper }} onClick={() => { setTheme(item.id); setStatus(''); }}>{theme === item.id && <Check size={14} />}</button>)}</div>
      <div className="lp-caption-editor"><label htmlFor="regional-caption">{t.captionLabel}<span>{caption.length}/48</span></label><input id="regional-caption" value={caption} maxLength={48} onChange={event => { setCaption(event.target.value); setStatus(''); }} /></div>
      <button className="lp-save-card" type="button" disabled={busy} onClick={save}><Download size={16} aria-hidden="true" />{busy ? t.saving : t.save}</button>
      <p className="lp-preview-status" aria-live="polite">{status || t.example}</p>
    </div>
  </div>;
}
