'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Cake, Check, Copy, Send } from 'lucide-react';
import { api, initializeSession } from '@/lib/client-api';
import { TERMS_VERSION } from '@/lib/policy';
import Consent from '../../growth/consent';
import { Sticker } from '../../theme-album';
import '../../theme-album.css';
import './birthday.css';
import '../../growth/cute.css';

const INVITE_DAYS = 7;
function localDay(offset = 0) { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function daysUntil(day: string) { return Math.round((new Date(day + 'T00:00:00').getTime() - new Date(localDay() + 'T00:00:00').getTime()) / 86400000); }
/** Korean "with" particle: 이랑 after a final consonant, 랑 otherwise. */
function withParticle(name: string) { const code = name.charCodeAt(name.length - 1) - 0xac00; return name + (code >= 0 && code < 11172 && code % 28 ? '이랑' : '랑'); }
export function birthdayMessage(hero: string, url: string, ko: boolean) {
  return ko ? `🎂 ${hero} 생일 앨범 만들었어!\n${withParticle(hero)} 찍은 사진 한 장이랑 한마디만 남겨줘. 생일날 한 권으로 보여줄 거야 🤫\n${url}`
    : `🎂 I made a birthday album for ${hero}!\nAdd one photo with ${hero} and a short note. We'll show it on the big day 🤫\n${url}`;
}

export default function BirthdayFlow({ locale }: { locale: string }) {
  const ko = locale === 'ko', text = (a: string, b: string) => ko ? a : b;
  const [ready, setReady] = useState(false), [accepted, setAccepted] = useState(false), [consent, setConsent] = useState(false);
  const [hero, setHero] = useState(''), [day, setDay] = useState(() => localDay(7)), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [album, setAlbum] = useState(''), [invite, setInvite] = useState(''), [copied, setCopied] = useState('');
  const albumRef = useRef(''), creationId = useRef('');
  useEffect(() => { let active = true; initializeSession().then(() => api<{ accepted: boolean }>('/api/policy')).then(p => {
    if (active) { setAccepted(p.accepted); setReady(true); }
  }).catch(() => { if (active) setError(ko ? '연결하지 못했어요. 새로고침해 주세요.' : 'Could not connect. Please reload.'); }); return () => { active = false; }; }, [ko]);
  const name = hero.trim(), title = ko ? `${name}의 생일` : `${name}'s birthday`, left = daysUntil(day);
  async function create(event: FormEvent) {
    event.preventDefault(); if (busy || !ready || !name || (!accepted && !consent)) return;
    setBusy(true); setError('');
    try {
      if (!accepted) { await api('/api/policy', { method: 'POST', body: JSON.stringify({ version: TERMS_VERSION, accepted: true }) }); setAccepted(true); }
      // Keep the created album if generating its invite fails; retry must not create duplicate albums.
      if (!albumRef.current) {
        creationId.current ||= crypto.randomUUID();
        const result = await api<{ id: string }>('/api/folders', { method: 'POST', body: JSON.stringify({ name: title, category: '생일', description: ko ? `친구들이 한 장씩 채운 ${name}의 생일 앨범` : `A birthday album for ${name}, filled in by friends`, startDate: day, endDate: day, source: 'organizer', creationId: creationId.current }) });
        albumRef.current = result.id; setAlbum(result.id);
      }
      const result = await api<{ token: string }>('/api/invites', { method: 'POST', body: JSON.stringify({ folderId: albumRef.current }) });
      setInvite(`${window.location.origin}/join/${result.token}?lang=${locale}`);
    } catch { setError(text('만들기를 완료하지 못했어요. 다시 누르면 이어서 진행합니다.', 'Could not finish. Try again to continue.')); }
    finally { setBusy(false); }
  }
  const message = invite ? birthdayMessage(name, invite, ko) : '';
  async function copy(value: string, what: string) {
    try { await navigator.clipboard.writeText(value); setCopied(what); } catch { setError(text('직접 선택해서 복사해 주세요.', 'Select and copy it manually.')); }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ text: message }); return; } catch { return; } }
    await copy(message, 'message');
  }
  return <main className="growth-page bday-flow cute-page"><nav className="growth-nav"><Link className="growth-brand" href={`/${locale}/hosts`}>memonestia.</Link><Link href={`/?lang=${locale}`}>{text('내 공간', 'My space')}</Link></nav>
    <section className="bday-sheet bday-card">
      <span className="cute-deco cute-deco-a" aria-hidden="true"><Sticker kind="cake" /></span>
      <p className="bday-kicker">{invite ? <><Check size={14} />{text('앨범이 준비됐어요', 'Your album is ready')}</> : <><Cake size={14} />{text('생일 앨범', 'Birthday album')}</>}</p>
      <h1 className="bday-heading">{invite ? text('이제 단톡방에 보내세요', 'Now send it to the group chat') : text('친구 생일, 앨범으로 선물해요', 'Give a birthday album')}</h1>
      <p className="bday-lead">{invite ? text('친구들이 링크를 열어 사진 한 장과 한마디를 남기면 자동으로 꾸며져요. 앱 설치도 가입도 필요 없어요.', 'Friends open the link and add a photo and a note. It decorates itself. No app or sign-up needed.') : text('친구들이 사진 한 장, 한마디씩 채우면 생일날 예쁜 앨범 한 권이 돼요.', 'Friends each add a photo and a note, and it becomes a pretty album by the big day.')}</p>

      <div className="ta-album theme-birthday bday-preview" aria-hidden="true">
        <div className="ta-garland">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>
        <div className="ta-cover"><span className="ta-kicker">HAPPY BIRTHDAY</span><h2>{name ? title : text('○○의 생일', 'Their birthday')}</h2>
          <p className="ta-cover-meta"><span>{left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : day.replaceAll('-', '.')}</span><span>{text('친구들이 채우는 중', 'Friends are filling it in')}</span></p></div>
        <div className="bday-slots">{[0, 1, 2].map(i => <span key={i} className="ta-photo"><span className="bday-slot">{['📸', '💌', '🎉'][i]}</span><small>{[text('사진 한 장', 'a photo'), text('한마디', 'a note'), text('친구 이름', 'their name')][i]}</small></span>)}</div>
      </div>

      {error && <p className="growth-error" role="alert">{error}</p>}
      {!invite ? <form className="bday-step" onSubmit={create}>
        <label className="growth-field">{text('누구의 생일인가요?', 'Whose birthday is it?')}<input required maxLength={30} disabled={Boolean(album)} value={hero} onChange={e => setHero(e.target.value)} placeholder={text('예: 지수', 'e.g. Jisoo')} enterKeyHint="next" /></label>
        <label className="growth-field">{text('생일 날짜', 'Birthday')}<input type="date" required min={localDay()} disabled={Boolean(album)} value={day} onChange={e => setDay(e.target.value)} /></label>
        {left > INVITE_DAYS && <p className="growth-note">{text(`초대 링크는 ${INVITE_DAYS}일간 유효해요. 생일이 더 남았다면 나중에 앨범에서 새 링크를 만들 수 있어요.`, `Invite links last ${INVITE_DAYS} days. You can make a fresh link from the album later.`)}</p>}
        {!accepted && <Consent ko={ko} checked={consent} onChange={setConsent} />}
        <p className="growth-note">{text('주인공 몰래 만들어도 돼요. 생일날 같은 링크를 주인공에게 보내면 완성된 앨범을 볼 수 있어요.', 'Keep it a surprise. On the day, send the same link to the birthday person so they can open the finished album.')}</p>
        <div className="bday-dock"><button className="growth-button" disabled={!ready || busy || !name || !day || (!accepted && !consent)}>{busy ? text('준비하고 있어요…', 'Preparing…') : !name ? text('주인공 이름을 적어주세요', 'Add their name first') : text(`${title} 앨범 만들기`, `Create ${title} album`)}<ArrowRight size={18} /></button></div>
      </form> : <div className="bday-step">
        <div className="bday-message"><span>{text('단톡방에 보낼 메시지', 'Message for the group chat')}</span><p>{message}</p></div>
        <div className="bday-copy-row">
          <button onClick={() => void copy(message, 'message')}><Copy size={15} />{copied === 'message' ? text('복사됨', 'Copied') : text('메시지 복사', 'Copy message')}</button>
          <button onClick={() => void copy(invite, 'link')}><Copy size={15} />{copied === 'link' ? text('복사됨', 'Copied') : text('링크만 복사', 'Copy link')}</button>
        </div>
        <p className="growth-note" role="status">{copied === 'message' ? text('메시지를 복사했어요. 단톡방에 붙여넣으세요. ', 'Message copied. Paste it in the group chat. ') : ''}{text(`링크는 ${INVITE_DAYS}일간 유효해요. 생일날 같은 링크를 주인공에게 보내 주세요.`, `The link lasts ${INVITE_DAYS} days. On the day, send the same link to the birthday person.`)}</p>
        <Link className="bday-more" href={`/?album=${album}&view=theme&lang=${locale}`}>{text('앨범 미리보기 →', 'Preview the album →')}</Link>
        <div className="bday-dock"><button className="growth-button" onClick={() => void share()}><Send size={18} />{text('카톡 단톡방에 보내기', 'Send to the group chat')}</button></div>
      </div>}
    </section></main>;
}
