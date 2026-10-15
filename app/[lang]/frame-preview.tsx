'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Film, Grid2X2, RectangleHorizontal } from 'lucide-react';
import type { PublicLanguage } from '@/lib/seo';

const frames = [
  { id: 'four', en: 'Four cuts', ko: '네컷', icon: Grid2X2 },
  { id: 'film', en: 'Film', ko: '필름', icon: Film },
  { id: 'postcard', en: 'Postcard', ko: '엽서', icon: RectangleHorizontal },
] as const;
const photos = ['friends', 'picnic', 'sea', 'friends'];

export default function FramePreview({ lang }: { lang: PublicLanguage }) {
  const [frame, setFrame] = useState<(typeof frames)[number]['id']>('four');
  const ko = lang === 'ko';
  const label = frames.find(item => item.id === frame)![lang];

  return <div className="lp-frame-demo">
    <div className="lp-preview-stage">
      <div className={`lp-memory-card lp-memory-card--${frame}`}>
        <div className="lp-card-masthead"><span>MEMOLUMI</span><span>GOOD DAYS, KEPT.</span></div>
        <h3>{ko ? '우리의 어느 여름' : 'Our little summer'}</h3>
        <div className="lp-card-photos">
          {photos.map((photo, index) => <div className={`lp-card-photo lp-card-photo--${index}`} key={index}>
            <Image src={`/landing/${photo}.webp`} alt="" fill sizes="(max-width: 600px) 140px, 200px" />
          </div>)}
        </div>
        <p>{ko ? '별일 없어서, 더 좋았던 날.' : 'Nothing special. Everything, really.'}</p>
        <span className="lp-card-date">A SUMMER TO REMEMBER</span>
      </div>
      <span className="lp-preview-note">made of little moments <span aria-hidden="true">↗</span></span>
    </div>
    <div className="lp-frame-controls" role="group" aria-label={ko ? '추억 카드 틀 미리보기' : 'Preview memory card frames'}>
      {frames.map(({ id, icon: Icon, ...name }) => <button type="button" key={id} aria-pressed={frame === id} onClick={() => setFrame(id)}>
        <Icon size={16} aria-hidden="true" />{name[lang]}{frame === id && <Check className="lp-frame-check" size={13} aria-hidden="true" />}
      </button>)}
    </div>
    <p className="lp-preview-status" aria-live="polite">{ko ? `${label} 스타일 미리보기 · 예시 사진` : `${label} preview · Example photos`}</p>
  </div>;
}
