'use client';
/* eslint-disable @next/next/no-img-element -- The QR code is a generated data URL. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Copy, Send } from 'lucide-react';
import QRCode from 'qrcode';
import { api, initializeSession } from '@/lib/client-api';
import { shareToKakao } from '@/lib/kakao-share';
import { TERMS_VERSION } from '@/lib/policy';
import { Sticker, type StickerKind } from '../../theme-album';
import Consent from '../../growth/consent';
import '../../theme-album.css';
import '../birthday/birthday.css';
import '../../growth/cute.css';

type Kind = 'crew' | 'trip';
const kinds: { id: Kind | 'birthday'; sticker: StickerKind; ko: [string, string, string]; en: [string, string, string] }[] = [
  { id: 'crew', sticker: 'heart', ko: ['우리 셋', '친한 친구 3~12명', '사진이 쌓이면 매달 "이번 달 우리" 앨범으로 꾸며져요'], en: ['Our little crew', '3 to 12 close friends', 'Photos turn into a "this month of us" album every month'] },
  { id: 'birthday', sticker: 'cake', ko: ['생일 앨범', '친구 생일 선물', '친구들이 한 장씩 채우면 생일날 완성'], en: ['Birthday album', 'A gift for a friend', 'Friends add a photo each; done by the big day'] },
  { id: 'trip', sticker: 'sun', ko: ['여행·모임', '여행, 동아리, 행사', '각자 찍은 사진을 한 앨범에'], en: ['Trip or gathering', 'Trips, clubs, events', 'Everyone’s photos in one album'] },
];

export default function StartFlow({ locale }: { locale: string }) {
  const ko = locale === 'ko', text = (a: string, b: string) => ko ? a : b;
  const [kind, setKind] = useState<Kind>('crew');
  const [ready, setReady] = useState(false), [accepted, setAccepted] = useState(false), [consent, setConsent] = useState(false);
  const [name, setName] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [album, setAlbum] = useState(''), [invite, setInvite] = useState(''), [qr, setQr] = useState(''), [copied, setCopied] = useState('');
  const albumRef = useRef('');
  const creationId = useRef('');
  useEffect(() => { let active = true; initializeSession().then(() => api<{ accepted: boolean }>('/api/policy')).then(p => {
    if (active) { setAccepted(p.accepted); setReady(true); }
  }).catch(() => { if (active) setError(ko ? '연결하지 못했어요. 새로고침해 주세요.' : 'Could not connect. Please reload.'); }); return () => { active = false; }; }, [ko]);
  const title = name.trim() || (kind === 'crew' ? text('우리 셋', 'Our little crew') : '');
  async function create(event: FormEvent) {
    event.preventDefault(); if (busy || !ready || !title || (!accepted && !consent)) return;
    setBusy(true); setError('');
    try {
      if (!accepted) { await api('/api/policy', { method: 'POST', body: JSON.stringify({ version: TERMS_VERSION, accepted: true }) }); setAccepted(true); }
      // Keep the created album if generating its invite fails; retry must not create duplicate albums.
      if (!albumRef.current) {
        creationId.current ||= crypto.randomUUID();
        const description = kind === 'crew' ? text('우리끼리 쌓아가는 사진 앨범. 매달 "이번 달 우리"로 꾸며져요.', 'Our own photo album, decorated as "this month of us".') : '';
        const result = await api<{ id: string }>('/api/folders', { method: 'POST', body: JSON.stringify({ name: title, category: kind === 'crew' ? '모임' : '여행', description, source: 'organizer', creationId: creationId.current }) });
        albumRef.current = result.id; setAlbum(result.id);
      }
      const result = await api<{ token: string }>('/api/invites', { method: 'POST', body: JSON.stringify({ folderId: albumRef.current }) });
      const url = `${window.location.origin}/join/${result.token}?lang=${locale}`;
      setInvite(url);
      setQr(await QRCode.toDataURL(url, { width: 200, margin: 2 }).catch(() => ''));
    } catch { setError(text('만들기를 완료하지 못했어요. 다시 누르면 이어서 진행합니다.', 'Could not finish. Try again to continue.')); }
    finally { setBusy(false); }
  }
  const message = invite ? (kind === 'crew'
    ? text(`💌 우리 셋 앨범 만들었어!\n폰에 있는 우리 사진 아무거나 올려줘. 매달 예쁘게 꾸며서 보여줄게\n${invite}`, `💌 I made an album for us!\nAdd any photos of us from your phone. It gets decorated every month.\n${invite}`)
    : text(`📸 ${title} 사진 여기 모으자!\n각자 찍은 사진 골라서 올려줘. 앱 설치 없이 링크만 누르면 돼\n${invite}`, `📸 Let's gather ${title} photos here!\nPick yours and add them. Just open the link, no app.\n${invite}`)) : '';
  async function copy(value: string, what: string) { try { await navigator.clipboard.writeText(value); setCopied(what); } catch { setError(text('직접 선택해서 복사해 주세요.', 'Select and copy it manually.')); } }
  async function kakao() {
    try { await shareToKakao(invite); }
    catch { if (navigator.share) { try { await navigator.share({ text: message }); } catch { /* Closing the sheet is fine. */ } } else await copy(message, 'message'); }
  }

  return <main className="growth-page cute-page"><nav className="growth-nav"><Link className="growth-brand" href={`/${locale}/hosts`}>memonestia<span>.</span></Link><Link href={`/?lang=${locale}`}>{text('내 공간', 'My space')}</Link></nav>
    <section className="cute-sheet">
      <span className="cute-deco cute-deco-a" aria-hidden="true"><Sticker kind="sparkle" /></span><span className="cute-deco cute-deco-b" aria-hidden="true"><Sticker kind="flower" /></span>
      {!invite ? <>
        <p className="cute-kicker">{text('1분이면 충분해요', 'Ready in a minute')}</p>
        <h1 className="cute-title">{text('어떤 앨범을 만들까요?', 'What are we making?')}</h1>
        <div className="cute-kinds" role="radiogroup" aria-label={text('앨범 종류', 'Album type')}>
          {kinds.map(k => {
            const [label, sub, hint] = ko ? k.ko : k.en;
            if (k.id === 'birthday') return <Link key={k.id} className="cute-kind" href={`/birthday?lang=${locale}`}><span className="cute-kind-icon"><Sticker kind={k.sticker} /></span><span><strong>{label}</strong><small>{sub}</small><em>{hint}</em></span><ArrowRight size={16} /></Link>;
            return <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} className="cute-kind" onClick={() => setKind(k.id as Kind)}><span className="cute-kind-icon"><Sticker kind={k.sticker} /></span><span><strong>{label}</strong><small>{sub}</small><em>{hint}</em></span><span className="cute-check" aria-hidden="true" /></button>;
          })}
        </div>
        {error && <p className="growth-error" role="alert">{error}</p>}
        <form className="growth-form" onSubmit={create}>
          <label className="growth-field">{kind === 'crew' ? text('우리 이름 (선택)', 'Our name (optional)') : text('여행·모임 이름', 'Trip or gathering name')}<input required={kind !== 'crew'} maxLength={80} disabled={Boolean(album)} value={name} onChange={e => setName(e.target.value)} placeholder={kind === 'crew' ? text('예: 삼총사, 우리 셋', 'e.g. The three of us') : text('예: 제주, 우리 다섯의 여름', 'e.g. Our autumn getaway')} /></label>
          {!accepted && <Consent ko={ko} checked={consent} onChange={setConsent} />}
          <div className="bday-dock"><button className="growth-button" disabled={!ready || busy || !title || (!accepted && !consent)}>{busy ? text('준비하고 있어요…', 'Preparing…') : text(`${title || '앨범'} 만들고 초대하기`, `Create ${title || 'album'} & invite`)}<ArrowRight size={18} /></button></div>
          <p className="growth-note">{text('앱 설치 없이 이 브라우저에서 바로 시작해요. 친구들도 링크만 누르면 돼요.', 'Starts right here in your browser. Friends just open the link.')}</p>
        </form>
      </> : <>
        <p className="cute-kicker">{text('앨범이 준비됐어요 🎉', 'Your album is ready 🎉')}</p>
        <h1 className="cute-title">{text('이제 친구들에게 보내요', 'Now send it to your friends')}</h1>
        <div className="cute-ticket"><strong>{title}</strong>{qr && <img src={qr} alt={text('초대 QR 코드', 'Invitation QR code')} width={150} height={150} />}<small>{text('현장에서는 QR을 보여주세요', 'Show the QR in person')}</small></div>
        <div className="bday-message"><span>{text('보낼 메시지', 'Message to send')}</span><p>{message}</p></div>
        <div className="bday-copy-row"><button onClick={() => void copy(message, 'message')}><Copy size={15} />{copied === 'message' ? text('복사됨', 'Copied') : text('메시지 복사', 'Copy message')}</button><button onClick={() => void copy(invite, 'link')}><Copy size={15} />{copied === 'link' ? text('복사됨', 'Copied') : text('링크만 복사', 'Copy link')}</button></div>
        <p className="growth-note">{text('초대 링크는 7일간 유효해요. 링크를 가진 사람은 앨범에 참여할 수 있으니 우리끼리만 공유해 주세요.', 'Invites last 7 days. Anyone with the link can join, so keep it within your group.')}</p>
        <Link className="bday-more" href={`/?album=${album}&view=theme&lang=${locale}`}>{text('내 앨범 열기 →', 'Open my album →')}</Link>
        <div className="bday-dock"><button className="growth-button cute-kakao" onClick={() => void kakao()}><Send size={18} />{text('카카오톡으로 보내기', 'Send on KakaoTalk')}</button></div>
      </>}
    </section></main>;
}
