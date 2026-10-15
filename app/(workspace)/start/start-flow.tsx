'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, Users } from 'lucide-react';
import QRCode from 'qrcode';
import { api, initializeSession } from '@/lib/client-api';
import { TERMS_VERSION } from '@/lib/policy';
import Consent from '../../growth/consent';

export default function StartFlow({ locale }: { locale: string }) {
  const ko = locale === 'ko', text = (a: string, b: string) => ko ? a : b;
  const [ready, setReady] = useState(false), [accepted, setAccepted] = useState(false), [consent, setConsent] = useState(false);
  const [name, setName] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [album, setAlbum] = useState(''), [invite, setInvite] = useState(''), [qr, setQr] = useState(''), [copied, setCopied] = useState(false);
  const albumRef = useRef('');
  const creationId = useRef('');
  useEffect(() => { let active = true; initializeSession().then(() => api<{ accepted: boolean }>('/api/policy')).then(p => {
    if (active) { setAccepted(p.accepted); setReady(true); }
  }).catch(() => { if (active) setError(ko ? '연결하지 못했어요. 새로고침해 주세요.' : 'Could not connect. Please reload.'); }); return () => { active = false; }; }, [ko]);
  async function create(event: FormEvent) {
    event.preventDefault(); if (busy || !ready || (!accepted && !consent)) return;
    setBusy(true); setError('');
    try {
      if (!accepted) { await api('/api/policy', { method: 'POST', body: JSON.stringify({ version: TERMS_VERSION, accepted: true }) }); setAccepted(true); }
      // Keep the created album if generating its invite fails; retry must not create duplicate albums.
      if (!albumRef.current) { creationId.current ||= crypto.randomUUID(); const result = await api<{ id: string }>('/api/folders', { method: 'POST', body: JSON.stringify({ name: name.trim(), category: '모임', source: 'organizer', creationId: creationId.current }) }); albumRef.current = result.id; setAlbum(result.id); }
      const result = await api<{ token: string }>('/api/invites', { method: 'POST', body: JSON.stringify({ folderId: albumRef.current }) });
      const url = `${window.location.origin}/join/${result.token}?lang=${locale}`;
      setInvite(url);
      setQr(await QRCode.toDataURL(url, { width: 200, margin: 2 }).catch(() => ''));
    } catch { setError(text('만들기를 완료하지 못했어요. 다시 누르면 이어서 진행합니다.', 'Could not finish. Try again to continue.')); }
    finally { setBusy(false); }
  }
  return <main className="growth-page"><nav className="growth-nav"><Link className="growth-brand" href={`/${locale}/hosts`}>memonestia.</Link><Link href={`/?lang=${locale}`}>{text('내 공간', 'My space')}</Link></nav>
    <section className="growth-card"><div className="growth-icon">{invite ? <Check /> : <Users />}</div><p className="growth-eyebrow">{invite ? 'READY FOR YOUR PEOPLE' : 'A SMALL START, A SHARED MEMORY'}</p>
      <h1>{invite ? text('이제, 모임에 보내세요.', 'Your invitation is ready.') : text('이번 모임의 사진을 모아볼까요?', 'Give your gathering a home.')}</h1>
      <p className="growth-lead">{invite ? text('단체 채팅방에 링크를 보내거나, 현장에서 QR을 보여주세요. 초대받은 사람은 앱 설치 없이 사진을 올릴 수 있어요.', 'Send the link to your group chat or show the QR. Guests can upload without installing an app.') : text('이름 하나면 시작할 수 있어요. 앨범을 만든 뒤 초대 링크가 바로 나옵니다.', 'Start with a name. Your invitation link is ready as soon as you create the album.')}</p>
      {error && <p className="growth-error" role="alert">{error}</p>}
      {!invite ? <form className="growth-form" onSubmit={create}><label className="growth-field">{text('모임·앨범 이름', 'Album name')}<input required maxLength={80} disabled={Boolean(album)} value={name} onChange={e => setName(e.target.value)} placeholder={text('예: 우리들의 가을 제주 여행', 'e.g. Our autumn getaway')} /></label>
        {!accepted && <Consent ko={ko} checked={consent} onChange={setConsent} />}
        <button className="growth-button" disabled={!ready || busy || !name.trim() || (!accepted && !consent)}>{busy ? text('준비하고 있어요…', 'Preparing…') : text('앨범 만들고 초대하기', 'Create album & invite')}<ArrowRight size={18} /></button>
        <p className="growth-note">{text('이 브라우저에서 바로 시작해요. 다른 기기에서도 관리하려면 내 공간에서 계정을 연결해 주세요.', 'Start in this browser. Connect an account in My space to manage your album on other devices.')}</p>
      </form> : <><h2>{name}</h2>{qr && <img className="growth-qr" src={qr} alt={text('모임 초대 QR 코드', 'Invitation QR code')} width={200} height={200} />}
        <div className="growth-copy"><input aria-label={text('초대 링크', 'Invite link')} readOnly value={invite} onFocus={e => e.target.select()} /><button aria-label={text('초대 링크 복사', 'Copy invite link')} onClick={async () => { try { await navigator.clipboard.writeText(invite); setCopied(true); } catch { setError(text('링크를 선택해 직접 복사해 주세요.', 'Select and copy the link manually.')); } }}><Copy size={18} /></button></div>
        <p className="growth-note" role="status">{copied ? text('링크를 복사했어요. ', 'Link copied. ') : ''}{text('초대는 7일간 유효해요. 링크를 가진 사람은 앨범에 참여할 수 있으니 모임 안에서 공유해 주세요.', 'Invites last 7 days. Anyone with the link can join, so share it with your group only.')}</p>
        <div className="growth-links"><Link className="growth-button" href={`/?room=${album}&lang=${locale}`}>{text('내 앨범 열기', 'Open my album')}<ArrowRight size={18} /></Link><Link className="growth-button secondary" href={`/?login=1&lang=${locale}`}>{text('계정 연결하고 앨범 지키기', 'Connect an account')}</Link></div></>}
    </section></main>;
}
