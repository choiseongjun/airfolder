/* eslint-disable @next/next/no-img-element -- Local demo photographs do not need remote optimization. */
'use client';
import { useState } from 'react';
import { ArrowRight, BookOpen, Check, Heart, Sparkles } from 'lucide-react';
import './guest-trial.css';

const SAMPLE_PHOTOS = ['/landing/sea.webp', '/landing/friends.webp', '/landing/picnic.webp', '/explore/photo-0.jpg', '/explore/photo-5.jpg', '/explore/photo-12.jpg', '/explore/photo-20.jpg', '/explore/photo-33.jpg'];

export default function GuestTrial({ ko, onStart }: { ko: boolean; onStart: () => void }) {
 const t = (a: string, b: string) => ko ? a : b;
 const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
 const [name, setName] = useState('');
 const [picked, setPicked] = useState<string[]>([]);
 const [note, setNote] = useState('');
 function toggle(src: string) { setPicked(old => old.includes(src) ? old.filter(s => s !== src) : old.length < 4 ? [...old, src] : old); }
 return <>
  <div className="modal-symbol"><Sparkles/></div>
  <h2>{t('10초 체험: 우리 책장 만들기', 'A 10-second try: make your bookshelf')}</h2>
  {step === 1 && <div className="trial-step">
   <p>{t('01 · 앨범에 이름을 붙여볼까요?', '01 · Give your album a name')}</p>
   <input autoFocus maxLength={40} value={name} onChange={e => setName(e.target.value)} placeholder={t('예: 우리들의 가을 여행', 'e.g. Our autumn trip')}/>
   <button className="primary-button full" style={{ marginTop: 14 }} disabled={!name.trim()} onClick={() => setStep(2)}>{t('다음', 'Next')}<ArrowRight size={16}/></button>
  </div>}
  {step === 2 && <div className="trial-step">
   <p>{t('02 · 좋아하는 사진을 담아보세요 (최대 4장)', '02 · Add your favorite photos (up to 4)')}</p>
   <div className="trial-photo-grid">{SAMPLE_PHOTOS.map((src, i) => <button key={src} type="button" className={picked.includes(src) ? 'is-picked' : ''} onClick={() => toggle(src)} aria-pressed={picked.includes(src)} aria-label={t(`사진 ${i + 1}`, `Photo ${i + 1}`)}><img src={src} alt=""/>{picked.includes(src) && <Check/>}</button>)}</div>
   <button className="primary-button full" disabled={!picked.length} onClick={() => setStep(3)}>{t('다음', 'Next')}<ArrowRight size={16}/></button>
  </div>}
  {step === 3 && <div className="trial-step">
   <p>{t('03 · 한 줄 남기고 페이지를 넘겨요', '03 · Leave a note and turn the page')}</p>
   <textarea maxLength={80} value={note} onChange={e => setNote(e.target.value)} placeholder={t('함께여서 좋았던 날', 'A day that was good together')}/>
   <button className="primary-button full" style={{ marginTop: 14 }} onClick={() => setStep(4)}>{t('책장 넘기기', 'Turn the page')}<BookOpen size={16}/></button>
  </div>}
  {step === 4 && <div className="trial-reveal">
   <div className="trial-page">
    <span className="trial-page-title">{name}</span>
    <div className="trial-page-photos">{picked.map(src => <img key={src} src={src} alt=""/>)}</div>
    {note && <p className="trial-page-note">“{note}”</p>}
    <span className="trial-page-stamp"><Heart size={13}/>{t('made with love', 'made with love')}</span>
   </div>
   <div className="trial-cta">
    <p>{t('만든 앨범을 저장하고 친구에게 공유하려면 3초 만에 시작하세요.', 'Save this album and share it with friends — start in 3 seconds.')}</p>
    <button className="primary-button full" onClick={onStart}>{t('3초 만에 시작하기', 'Start in 3 seconds')}<ArrowRight size={16}/></button>
   </div>
  </div>}
 </>;
}
