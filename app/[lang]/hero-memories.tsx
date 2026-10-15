'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Heart, MoveHorizontal, X } from 'lucide-react';
import type { PublicLanguage } from '@/lib/seo';
import { landingCopy } from './landing-copy';

const photos = ['picnic', 'friends', 'sea'] as const;

export default function HeroMemories({ lang }: { lang: PublicLanguage }) {
  const t = landingCopy[lang];
  const ko = lang === 'ko';
  const [active, setActive] = useState(1);
  const [viewed, setViewed] = useState<number | null>(null);
  const fan = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const move = (direction: number) => setActive(current => (current + direction + photos.length) % photos.length);

  useEffect(() => {
    if (viewed === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [viewed]);

  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--pointer-x', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 13}px`);
    event.currentTarget.style.setProperty('--pointer-y', `${((event.clientY - bounds.top) / bounds.height - 0.5) * 9}px`);
  };
  const endGesture = (event: PointerEvent<HTMLButtonElement>) => {
    if (!gesture.current) return;
    const dx = event.clientX - gesture.current.x;
    const dy = event.clientY - gesture.current.y;
    gesture.current = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      swiped.current = true;
      move(dx < 0 ? 1 : -1);
    }
  };
  const open = (index: number) => {
    if (swiped.current) { swiped.current = false; return; }
    setViewed(index);
    dialog.current?.showModal();
  };

  return <div className="lp-memory-experience">
    <div className="lp-photo-fan lp-photo-fan--interactive" ref={fan} onPointerMove={pointerMove} onPointerLeave={() => {
      fan.current?.style.setProperty('--pointer-x', '0px');
      fan.current?.style.setProperty('--pointer-y', '0px');
    }}>
      <span className="lp-photo-doodle lp-photo-doodle--star" aria-hidden="true">✳</span>
      {photos.map((photo, index) => {
        const slot = (index - active + 4) % 3;
        return <button type="button" className={`lp-polaroid lp-polaroid--${slot}`} key={photo}
          aria-label={`${t.heroPhotos[index]} — ${ko ? '사진 크게 보기' : 'Open photo'}`}
          onPointerDown={event => {
            if (!event.isPrimary || event.button !== 0) return;
            gesture.current = { x: event.clientX, y: event.clientY };
            swiped.current = false;
            event.currentTarget.setPointerCapture(event.pointerId);
          }} onPointerUp={endGesture} onPointerCancel={() => { gesture.current = null; swiped.current = false; }}
          onClick={event => { if (event.detail === 0) swiped.current = false; open(index); }}>
          <span className="lp-polaroid-image"><Image src={`/landing/${photo}.webp`} alt={t.photoAlts[index]} fill sizes="(max-width: 600px) 58vw, 330px" loading="eager" fetchPriority={index === 1 ? 'high' : 'auto'} draggable={false} /></span>
          <span className="lp-polaroid-caption"><span>{t.heroPhotos[index]}</span><Heart size={15} strokeWidth={1.3} aria-hidden="true" /></span>
          <span className="lp-polaroid-bottom"><span>OUR LITTLE MOMENTS</span><span>0{index + 1}</span></span>
          <span className="lp-photo-open" aria-hidden="true">{ko ? '이 순간 열어보기' : 'Open this moment'} ↗</span>
        </button>;
      })}
      <span className="lp-photo-note">{t.handwritten}<span aria-hidden="true">⤴</span></span>
      <span className="lp-photo-doodle lp-photo-doodle--sun" aria-hidden="true">☀</span>
    </div>
    <div className="lp-memory-navigation">
      <button type="button" onClick={() => move(-1)} aria-label={ko ? '이전 추억' : 'Previous memory'}><ArrowLeft size={17} /></button>
      <span className="lp-memory-count" aria-live="polite">0{active + 1}<span> / 03</span></span>
      <button type="button" onClick={() => move(1)} aria-label={ko ? '다음 추억' : 'Next memory'}><ArrowRight size={17} /></button>
      <span className="lp-memory-tip"><MoveHorizontal size={14} aria-hidden="true" />{ko ? '옆으로 넘기거나 사진을 눌러보세요' : 'Swipe through. Tap a moment.'}</span>
    </div>
    <dialog ref={dialog} className="lp-memory-dialog" aria-labelledby="memory-dialog-title" onClose={() => setViewed(null)}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          setViewed(current => current === null ? null : (current + (event.key === 'ArrowRight' ? 1 : 2)) % 3);
        }
      }}>
      {viewed !== null && <div className="lp-memory-expanded">
        <button className="lp-dialog-close" type="button" onClick={() => dialog.current?.close()} aria-label={ko ? '사진 닫기' : 'Close photo'}><X size={22} /></button>
        <div className="lp-memory-large-photo"><Image key={viewed} src={`/landing/${photos[viewed]}.webp`} alt={t.photoAlts[viewed]} fill sizes="(max-width: 760px) 90vw, 650px" /></div>
        <div className="lp-memory-detail"><span className="lp-eyebrow">A LITTLE MOMENT, KEPT FOREVER.</span><h2 id="memory-dialog-title">{t.heroPhotos[viewed]}</h2><p>{t.handwritten}</p></div>
        <div className="lp-dialog-navigation"><button type="button" onClick={() => setViewed((viewed + 2) % 3)} aria-label={ko ? '이전 사진' : 'Previous photo'}><ArrowLeft size={18} /></button><span>0{viewed + 1} / 03 · {t.example}</span><button type="button" onClick={() => setViewed((viewed + 1) % 3)} aria-label={ko ? '다음 사진' : 'Next photo'}><ArrowRight size={18} /></button></div>
      </div>}
    </dialog>
  </div>;
}
