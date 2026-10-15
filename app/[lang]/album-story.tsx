'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Check, Heart, Link2, Plus, Users } from 'lucide-react';
import type { PublicLanguage } from '@/lib/seo';
import { landingCopy } from './landing-copy';

export default function AlbumStory({ lang }: { lang: PublicLanguage }) {
  const [step, setStep] = useState(0);
  const t = landingCopy[lang];
  const ko = lang === 'ko';
  const stages = ko ? ['우리만의 빈 페이지', '좋아하는 사람들을 초대해요', '각자의 순간이 하나로'] : ['A blank page, just for us', 'Bring your favorite people', 'Your moments, together'];
  return <section className="lp-gather lp-section" id="how-it-works" aria-labelledby="gather-title">
    <div className="lp-album-scene" data-reveal>
      <div className="lp-album-back" aria-hidden="true" />
      <div className="lp-album-demo" data-step={step}>
        <div className="lp-album-top"><span><span className="lp-tiny-dot" />SHARED ALBUM</span><span>0{step + 1} / 03</span></div>
        <h3>{t.albumName}</h3><p>{t.albumSubtitle}</p>
        <div className="lp-album-story-stage" aria-live="polite">
          {step === 0 && <div className="lp-album-empty lp-story-enter" key="empty"><div className="lp-empty-sheet"><Heart size={31} strokeWidth={1} /><span>OUR SUMMER</span><i>starts here.</i></div><h4>{stages[0]}</h4><p>{ko ? '아직 비어 있어도, 벌써 우리다운 공간.' : 'Empty for now. Already feels like us.'}</p></div>}
          {step === 1 && <div className="lp-album-invite lp-story-enter" key="invite"><span className="lp-invite-orbit"><span>J</span><span>S</span><span>M</span><Users size={27} strokeWidth={1.3} /></span><h4>{stages[1]}</h4><div className="lp-invite-ticket"><Link2 size={17} /><span>memolumi / our-summer</span><Check size={16} /></div><p>{ko ? '링크 하나면, 우리의 이야기가 시작돼요.' : 'One little link. A story together.'}</p></div>}
          {step === 2 && <div className="lp-album-grid lp-story-enter" key="photos">{['friends', 'picnic', 'sea'].map((photo, index) => <div className={`lp-album-photo${index === 0 ? ' lp-album-photo--wide' : ''}`} key={photo}><Image src={`/landing/${photo}.webp`} alt="" fill sizes="(max-width: 600px) 75vw, 420px" /></div>)}</div>}
        </div>
        <div className="lp-album-bottom"><div className="lp-member-dots" aria-hidden="true">{(step === 0 ? ['J'] : ['J', 'S', 'M']).map(name => <span key={name}>{name}</span>)}<span><Plus size={12} /></span></div><span>{stages[step]}</span><Heart size={17} aria-hidden="true" /></div>
        <button className="lp-album-next" type="button" onClick={() => setStep(value => (value + 1) % 3)}>{step === 2 ? (ko ? '처음부터 다시 보기' : 'See it again') : (ko ? '다음 장면 보기' : 'See the next step')}<ArrowRight size={14} aria-hidden="true" /></button>
      </div>
      <span className="lp-scene-caption">{t.example}</span>
      <span className="lp-album-sticker" aria-hidden="true">better<br /><i>together</i></span>
    </div>
    <div className="lp-feature-copy" data-reveal>
      <p className="lp-eyebrow">01 — TOGETHER, IN ONE PLACE</p>
      <h2 id="gather-title">{t.gatherTitle[0]}<br /><em>{t.gatherTitle[1]}</em></h2>
      <p className="lp-body-copy">{t.gatherBody}</p>
      <ol className="lp-how-steps lp-how-steps--interactive">{t.gatherSteps.map(([title, body], index) => <li key={title}><button type="button" aria-pressed={step === index} onClick={() => setStep(index)}>
        <span className="lp-step-index">0{index + 1}</span><span><strong>{title}</strong><span className="lp-step-description">{body}</span></span><ArrowRight size={17} aria-hidden="true" />
      </button></li>)}</ol>
      <p className="lp-interaction-note">{ko ? '단계를 눌러 우리의 앨범을 완성해보세요.' : 'Tap a step. Watch your album come together.'}</p>
    </div>
  </section>;
}
