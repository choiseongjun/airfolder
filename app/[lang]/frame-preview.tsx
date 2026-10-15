'use client';

import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import Image from 'next/image';
import { Check, Download, Film, Grid2X2, LoaderCircle, RectangleHorizontal, RotateCcw, Shuffle } from 'lucide-react';
import type { PublicLanguage } from '@/lib/seo';
import { cardPalette, cardThemes, stickerDesigns, type CardSticker, type StickerId, type FrameId, type ThemeId } from './memory-card-style';

const frames = [
  { id: 'four', en: 'Four cuts', ko: '네컷', icon: Grid2X2 },
  { id: 'film', en: 'Film', ko: '필름', icon: Film },
  { id: 'postcard', en: 'Postcard', ko: '엽서', icon: RectangleHorizontal },
] as const;
const sourcePhotos = ['friends', 'picnic', 'sea'];

export default function FramePreview({ lang }: { lang: PublicLanguage }) {
  const [frame, setFrame] = useState<FrameId>('four');
  const [theme, setTheme] = useState<ThemeId>('cream');
  const [photos, setPhotos] = useState(['friends', 'picnic', 'sea', 'friends']);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [stickers, setStickers] = useState<CardSticker[]>([]);
  const card = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: StickerId; pointer: number; x: number; y: number; left: number; top: number; width: number; height: number } | null>(null);
  const ko = lang === 'ko';
  const [caption, setCaption] = useState(ko ? '별일 없어서, 더 좋았던 날.' : 'Nothing special. Everything, really.');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const label = frames.find(item => item.id === frame)![lang];
  const palette = cardPalette(frame, theme);
  const title = ko ? '우리의 어느 여름' : 'Our little summer';
  const placeSticker = (id: StickerId, x: number, y: number) => {
    setStickers(current => current.map(item => item.id === id ? { ...item, x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) } : item));
    setSaveStatus('');
  };
  const moveSticker = (event: PointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    placeSticker(start.id, start.left + (event.clientX - start.x) / start.width * 100, start.top + (event.clientY - start.y) / start.height * 100);
  };
  const reset = () => {
    setPhotos(['friends', 'picnic', 'sea', 'friends']); setSelectedPhoto(0); setStickers([]);
    setFrame('four'); setTheme('cream'); setCaption(ko ? '별일 없어서, 더 좋았던 날.' : 'Nothing special. Everything, really.');
    setSaveStatus(ko ? '처음 모습으로 되돌렸어요.' : 'Back to a fresh little canvas.');
  };
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveStatus('');
    try {
      const { exportMemoryCard } = await import('./export-memory-card');
      await exportMemoryCard({ frame, theme, photos, title, caption, stickers });
      setSaveStatus(ko ? '이미지 다운로드를 시작했어요.' : 'Your image download has started.');
    } catch {
      setSaveStatus(ko ? '저장하지 못했어요. 다시 시도해 주세요.' : 'Couldn’t save the image. Please try again.');
    } finally { setSaving(false); }
  };

  return <div className="lp-frame-demo" data-reveal>
    <div className="lp-preview-stage">
      <span className="lp-studio-label">YOUR LITTLE CREATIVE PLAYGROUND<span>TRY IT YOURSELF</span></span>
      <div ref={card} key={frame} className={`lp-memory-card lp-memory-card--${frame} lp-card-develop lp-memory-card--editable`} style={{ '--card-paper': palette.paper, '--card-ink': palette.ink } as CSSProperties}>
        <div className="lp-card-masthead"><span>MEMONESTIA</span><span>GOOD DAYS, KEPT.</span></div>
        <h3>{title}</h3>
        <div className="lp-card-photos">
          {photos.map((photo, index) => <button type="button" className={`lp-card-photo lp-card-photo--${index}`} key={index}
            aria-label={ko ? `${index + 1}번 사진 바꾸기` : `Change photo ${index + 1}`} aria-pressed={selectedPhoto === index}
            onClick={() => setSelectedPhoto(index)}>
            <Image src={`/landing/${photo}.webp`} alt="" fill sizes="(max-width: 600px) 140px, 200px" />
            <span className="lp-photo-slot">0{index + 1}</span>
          </button>)}
        </div>
        <p>{caption || '\u00a0'}</p>
        <span className="lp-card-date">A SUMMER TO REMEMBER</span>
        {stickers.map(sticker => {
          const design = stickerDesigns.find(item => item.id === sticker.id)!;
          return <button type="button" key={sticker.id} className="lp-card-sticker" style={{ left: `${sticker.x}%`, top: `${sticker.y}%` }}
            aria-label={ko ? `${design.ko} 스티커: 드래그 또는 방향키로 이동, Delete로 제거` : `${design.en} sticker: drag or use arrow keys to move, Delete to remove`}
            onPointerDown={event => {
              if (!event.isPrimary || event.button !== 0) return;
              const bounds = card.current?.getBoundingClientRect();
              if (!bounds) return;
              event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { id: sticker.id, pointer: event.pointerId, x: event.clientX, y: event.clientY, left: sticker.x, top: sticker.y, width: bounds.width, height: bounds.height };
            }} onPointerMove={moveSticker} onPointerUp={event => { moveSticker(event); drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
            onKeyDown={event => {
              if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); setStickers(current => current.filter(item => item.id !== sticker.id)); setSaveStatus(''); }
              if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
              event.preventDefault(); const step = event.shiftKey ? 10 : 2;
              placeSticker(sticker.id, sticker.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), sticker.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0));
            }}>
            <svg viewBox="0 0 100 100" aria-hidden="true"><path d={design.path} fill={design.color} stroke="#fffdf3" strokeWidth="5" paintOrder="stroke" /></svg>
          </button>;
        })}
      </div>
      <span className="lp-preview-note">made of little moments <span aria-hidden="true">↗</span></span>
    </div>
    <div className="lp-studio-toolbar">
      <div className="lp-theme-swatches" role="group" aria-label={ko ? '카드 색감' : 'Card color'}>{cardThemes.map(item => <button type="button" key={item.id} aria-pressed={theme === item.id} aria-label={item[lang]} title={item[lang]} style={{ backgroundColor: item.paper }} onClick={() => { setTheme(item.id); setSaveStatus(''); }}>{theme === item.id && <Check size={14} aria-hidden="true" />}</button>)}</div>
      <button className="lp-shuffle" type="button" onClick={() => { setPhotos(current => [...current.slice(1), current[0]]); setSaveStatus(''); }}><Shuffle size={15} aria-hidden="true" />{ko ? '사진 섞기' : 'Shuffle photos'}</button>
    </div>
    <div className="lp-frame-controls" role="group" aria-label={ko ? '추억 카드 틀 미리보기' : 'Preview memory card frames'}>
      {frames.map(({ id, icon: Icon, ...name }) => <button type="button" key={id} aria-pressed={frame === id} onClick={() => { setFrame(id); setSelectedPhoto(0); setSaveStatus(''); }}>
        <Icon size={16} aria-hidden="true" />{name[lang]}{frame === id && <Check className="lp-frame-check" size={13} aria-hidden="true" />}
      </button>)}
    </div>
    <div className="lp-play-tools">
      <div className="lp-play-heading"><span>{ko ? '01 / 사진 고르기' : '01 / Pick your moments'}</span><span aria-live="polite">{ko ? `${selectedPhoto + 1}번 칸 선택됨` : `Slot ${selectedPhoto + 1} selected`}</span></div>
      <div className="lp-photo-picks" role="group" aria-label={ko ? '선택한 칸에 넣을 예시 사진' : 'Example photos for the selected slot'}>
        {sourcePhotos.map((photo, index) => <button type="button" key={photo} aria-pressed={photos[selectedPhoto] === photo}
          aria-label={ko ? ['친구 사진 넣기', '소풍 사진 넣기', '바다 사진 넣기'][index] : ['Use friends photo', 'Use picnic photo', 'Use sea photo'][index]}
          onClick={() => { setPhotos(current => current.map((value, slot) => slot === selectedPhoto ? photo : value)); setSaveStatus(''); }}>
          <Image src={`/landing/${photo}.webp`} alt="" fill sizes="100px" />{photos[selectedPhoto] === photo && <Check size={16} aria-hidden="true" />}
        </button>)}
      </div>
      <div className="lp-play-heading"><span>{ko ? '02 / 스티커 붙이기' : '02 / Add a little personality'}</span><button type="button" onClick={reset} aria-label={ko ? '카드 처음부터 꾸미기' : 'Reset the card'}><RotateCcw size={13} />{ko ? '다시' : 'Reset'}</button></div>
      <div className="lp-sticker-picks" role="group" aria-label={ko ? '카드 스티커' : 'Card stickers'}>{stickerDesigns.map((design, index) => <button type="button" key={design.id}
        aria-pressed={stickers.some(item => item.id === design.id)} onClick={() => {
          setStickers(current => current.some(item => item.id === design.id) ? current.filter(item => item.id !== design.id) : [...current, { id: design.id, x: 81 - index * 29, y: 68 - index * 21 }]); setSaveStatus('');
        }}><svg viewBox="0 0 100 100" aria-hidden="true"><path d={design.path} fill={design.color} /></svg>{design[lang]}</button>)}</div>
      <p className="lp-play-hint">{ko ? '사진 칸을 눌러 바꾸고, 스티커는 원하는 곳으로 끌어보세요.' : 'Tap a photo to replace it. Drag your stickers anywhere.'}</p>
    </div>
    <div className="lp-caption-editor"><label htmlFor="memory-caption">{ko ? '이날을 한마디로' : 'A few words for this day'}<span aria-hidden="true">{caption.length}/48</span></label><input id="memory-caption" value={caption} maxLength={48} onChange={event => { setCaption(event.target.value); setSaveStatus(''); }} placeholder={ko ? '다시 돌아가고 싶은 순간.' : 'A day I’d go back to.'} /></div>
    <button type="button" className="lp-save-card" onClick={save} disabled={saving}>{saving ? <LoaderCircle className="lp-spinner" size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}{saving ? (ko ? '이미지 만드는 중' : 'Making your image') : (ko ? '이 카드 이미지로 저장' : 'Save this little memory')}</button>
    <p className="lp-preview-status" aria-live="polite">{saveStatus || (ko ? `${label} 스타일 체험 · 예시 사진` : `${label} demo · Example photos`)}</p>
  </div>;
}
