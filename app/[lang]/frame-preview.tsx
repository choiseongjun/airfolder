'use client';

import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { Check, Download, Film, Grid2X2, LoaderCircle, RectangleHorizontal, Shuffle } from 'lucide-react';
import type { PublicLanguage } from '@/lib/seo';
import { cardPalette, cardThemes, type FrameId, type ThemeId } from './memory-card-style';

const frames = [
  { id: 'four', en: 'Four cuts', ko: '네컷', icon: Grid2X2 },
  { id: 'film', en: 'Film', ko: '필름', icon: Film },
  { id: 'postcard', en: 'Postcard', ko: '엽서', icon: RectangleHorizontal },
] as const;
const sourcePhotos = ['friends', 'picnic', 'sea'];

export default function FramePreview({ lang }: { lang: PublicLanguage }) {
  const [frame, setFrame] = useState<FrameId>('four');
  const [theme, setTheme] = useState<ThemeId>('cream');
  const [offset, setOffset] = useState(0);
  const ko = lang === 'ko';
  const [caption, setCaption] = useState(ko ? '별일 없어서, 더 좋았던 날.' : 'Nothing special. Everything, really.');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const label = frames.find(item => item.id === frame)![lang];
  const photos = Array.from({ length: 4 }, (_, index) => sourcePhotos[(index + offset) % sourcePhotos.length]);
  const palette = cardPalette(frame, theme);
  const title = ko ? '우리의 어느 여름' : 'Our little summer';
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveStatus('');
    try {
      const { exportMemoryCard } = await import('./export-memory-card');
      await exportMemoryCard({ frame, theme, photos, title, caption });
      setSaveStatus(ko ? '이미지 다운로드를 시작했어요.' : 'Your image download has started.');
    } catch {
      setSaveStatus(ko ? '저장하지 못했어요. 다시 시도해 주세요.' : 'Couldn’t save the image. Please try again.');
    } finally { setSaving(false); }
  };

  return <div className="lp-frame-demo" data-reveal>
    <div className="lp-preview-stage">
      <span className="lp-studio-label">THE LITTLE MEMORY STUDIO<span>LIVE PREVIEW</span></span>
      <div key={`${frame}-${offset}`} className={`lp-memory-card lp-memory-card--${frame} lp-card-develop`} style={{ '--card-paper': palette.paper, '--card-ink': palette.ink } as CSSProperties}>
        <div className="lp-card-masthead"><span>MEMOLUMI</span><span>GOOD DAYS, KEPT.</span></div>
        <h3>{title}</h3>
        <div className="lp-card-photos">
          {photos.map((photo, index) => <div className={`lp-card-photo lp-card-photo--${index}`} key={index}>
            <Image src={`/landing/${photo}.webp`} alt="" fill sizes="(max-width: 600px) 140px, 200px" />
          </div>)}
        </div>
        <p>{caption || '\u00a0'}</p>
        <span className="lp-card-date">A SUMMER TO REMEMBER</span>
      </div>
      <span className="lp-preview-note">made of little moments <span aria-hidden="true">↗</span></span>
    </div>
    <div className="lp-studio-toolbar">
      <div className="lp-theme-swatches" role="group" aria-label={ko ? '카드 색감' : 'Card color'}>{cardThemes.map(item => <button type="button" key={item.id} aria-pressed={theme === item.id} aria-label={item[lang]} title={item[lang]} style={{ backgroundColor: item.paper }} onClick={() => { setTheme(item.id); setSaveStatus(''); }}>{theme === item.id && <Check size={14} aria-hidden="true" />}</button>)}</div>
      <button className="lp-shuffle" type="button" onClick={() => { setOffset(value => (value + 1) % 3); setSaveStatus(''); }}><Shuffle size={15} aria-hidden="true" />{ko ? '사진 섞기' : 'Shuffle photos'}</button>
    </div>
    <div className="lp-frame-controls" role="group" aria-label={ko ? '추억 카드 틀 미리보기' : 'Preview memory card frames'}>
      {frames.map(({ id, icon: Icon, ...name }) => <button type="button" key={id} aria-pressed={frame === id} onClick={() => { setFrame(id); setSaveStatus(''); }}>
        <Icon size={16} aria-hidden="true" />{name[lang]}{frame === id && <Check className="lp-frame-check" size={13} aria-hidden="true" />}
      </button>)}
    </div>
    <div className="lp-caption-editor"><label htmlFor="memory-caption">{ko ? '이날을 한마디로' : 'A few words for this day'}<span aria-hidden="true">{caption.length}/48</span></label><input id="memory-caption" value={caption} maxLength={48} onChange={event => { setCaption(event.target.value); setSaveStatus(''); }} placeholder={ko ? '다시 돌아가고 싶은 순간.' : 'A day I’d go back to.'} /></div>
    <button type="button" className="lp-save-card" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="lp-spinner" size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}{saving ? (ko ? '이미지 만드는 중' : 'Making your image') : (ko ? '이 카드 이미지로 저장' : 'Save this little memory')}</button>
    <p className="lp-preview-status" aria-live="polite">{saveStatus || (ko ? `${label} 스타일 체험 · 예시 사진` : `${label} demo · Example photos`)}</p>
  </div>;
}
