'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, ImagePlus, Link2, Send } from 'lucide-react';
import { api, initializeSession } from '@/lib/client-api';
import { trackClient } from '@/lib/growth-client';
import { uploadFailureReason, type ClientGrowthEvent } from '@/lib/growth-events';
import { createPhotoRequest, photoRequestMessage, type PhotoRequestState } from '@/lib/photo-request';
import { TERMS_VERSION } from '@/lib/policy';
import { joinedAlbumHref } from '@/lib/album-navigation';
import Consent from './growth/consent';
import './photo-request-start.css';

export default function PhotoRequestStart() {
  const [name, setName] = useState(''), [accepted, setAccepted] = useState(false), [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<{ folderId: string; link: string; name: string } | null>(null);
  const attempt = useRef(''), progress = useRef<PhotoRequestState | null>(null), working = useRef(false);
  const seen = useRef(new Set<string>());
  function measure(event: ClientGrowthEvent, properties: Record<string, unknown> = {}, contextId?: string) {
    attempt.current ||= crypto.randomUUID();
    if (event !== 'photo_request_failed' && seen.current.has(event)) return;
    seen.current.add(event);
    void trackClient(event, { flow: 'photo_request', attempt_id: attempt.current, ...properties }, contextId);
  }
  useEffect(() => {
    attempt.current ||= crypto.randomUUID();
    if (!seen.current.has('photo_request_viewed')) {
      seen.current.add('photo_request_viewed');
      void trackClient('photo_request_viewed', { flow: 'photo_request', attempt_id: attempt.current });
    }
    let active = true;
    void api<{ accepted: boolean }>('/api/policy').then(p => { if (active) setAccepted(p.accepted); }).catch(() => {});
    return () => { active = false; };
  }, []);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (working.current || (!accepted && !consent)) return;
    working.current = true; setBusy(true); setError('');
    measure('photo_request_started');
    try {
      await initializeSession();
      if (!accepted) {
        await api('/api/policy', { method: 'POST', body: JSON.stringify({ version: TERMS_VERSION, accepted: true }) });
        setAccepted(true);
      }
      progress.current ||= { creationId: crypto.randomUUID(), name: name.trim() || '우리의 여행' };
      setLocked(true);
      const album = await createPhotoRequest(api, progress.current, attempt.current);
      const link = new URL(`/join/${album.token}`, window.location.origin);
      link.searchParams.set('lang', 'ko'); link.searchParams.set('album', album.folderId); link.searchParams.set('request', 'photos');
      setResult({ folderId: album.folderId, link: link.toString(), name: progress.current.name });
    } catch (cause) {
      measure('photo_request_failed', { reason: uploadFailureReason(cause instanceof Error ? cause.message : '') });
      setError('링크를 만들지 못했어요. 다시 누르면 같은 앨범에서 이어서 진행합니다.');
    } finally { working.current = false; setBusy(false); }
  }
  const message = result ? photoRequestMessage(result.name, result.link) : '';
  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(message);
      setNotice('복사했어요. 여행 단톡방에 붙여넣어 보내세요.');
      measure('photo_request_link_copied', {}, result.folderId);
    } catch { setNotice('자동 복사가 안 돼요. 아래 메시지를 길게 눌러 직접 복사해 주세요.'); }
  }
  async function share() {
    if (!result) return;
    if (!navigator.share) { await copy(); return; }
    try {
      const sending = navigator.share({ title: result.name, text: message });
      measure('photo_request_share_opened', {}, result.folderId);
      await sending;
      setNotice('친구가 사진을 보내면 같은 앨범에 모여요.');
    } catch (cause) { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setNotice('공유 창을 열지 못했어요. 메시지를 복사해서 보내주세요.'); }
  }
  return <section className="photo-request" aria-label="여행 사진 모으기">
    <header className="photo-request-heading">
      <span className="photo-request-kicker">여행 다녀온 친구들과</span>
      <h1>{result ? <>이 메시지를<br/>여행 단톡방에 보내세요.</> : <>친구 폰 속 내 사진,<br/>링크 하나로 모아요.</>}</h1>
      <p>{result ? '친구는 링크를 열고 사진을 골라 보낼 수 있어요.' : '내 사진이 아직 없어도 시작하세요. 사진 받을 링크를 보내면, 각자 찍은 사진이 한 앨범에 모여요.'}</p>
    </header>
    {!result ? <>
      <ol className="photo-request-steps"><li><Link2 size={18}/><span>받을 링크 만들기</span></li><li><Send size={18}/><span>단톡방에 보내기</span></li><li><ImagePlus size={18}/><span>친구가 사진 보태기</span></li></ol>
      <form onSubmit={create} className="photo-request-form">
        <label className="photo-request-name">여행 이름 (선택)<input maxLength={80} disabled={busy || locked} value={name} onChange={e => setName(e.target.value)} placeholder="예: 부산에서 보낸 주말"/></label>
        {!accepted && <Consent ko checked={consent} onChange={setConsent}/>}
        <button className="photo-request-primary" disabled={busy || (!accepted && !consent)}>{busy ? '사진 받을 곳을 준비하고 있어요…' : '사진 받을 링크 만들기'}<ArrowRight size={18}/></button>
        <p className="photo-request-small">사진 선택 없이 시작 · 친구도 앱 설치·회원가입 없이 참여</p>
        {error && <p role="alert" className="photo-request-error">{error}</p>}
      </form>
      <details className="photo-request-example"><summary>친구에게는 어떻게 보이나요?</summary><div className="photo-request-chat"><span>단톡방에 보낼 메시지 예시</span><p>우리 여행 사진 여기 모으자 📷<br/>네 폰에 있는 우리 사진, 내가 나온 사진도 보내줘!</p><div><ImagePlus size={20}/><strong>친구에게 보낼 사진 고르기</strong><small>고른 사진만 전송 전에 확인해요.</small></div></div></details>
      <div className="photo-request-alternative"><p>이미 내 사진이 준비돼 있다면</p><Link href="/make?occasion=travel&mode=decorate">내 사진으로 여행 앨범 꾸미기 <ArrowRight size={16}/></Link></div>
    </> : <div className="photo-request-result">
      <p className="photo-request-ready"><Check size={18}/> {result.name} · 사진 받을 준비 완료</p>
      <label>친구에게 보낼 메시지<textarea readOnly rows={6} value={message} onFocus={e=>e.currentTarget.select()}/></label>
      <button className="photo-request-primary" onClick={()=>void copy()}><Copy size={18}/>메시지와 링크 복사</button>
      <button className="photo-request-secondary" onClick={()=>void share()}><Send size={18}/>공유 앱으로 보내기</button>
      {notice && <p role="status" className="photo-request-notice">{notice}</p>}
      <Link className="photo-request-album" href={joinedAlbumHref('ko', result.folderId)}>모인 사진 확인 · 내 사진도 추가하기 <ArrowRight size={16}/></Link>
      <details><summary>친구에게 보낼 화면 미리보기</summary><Link href={result.link} target="_blank" rel="noreferrer">사진 보내기 화면 열기 ↗</Link></details>
      <p className="photo-request-small">비회원 앨범은 이 브라우저에서 다시 열 수 있어요. 다른 기기에서도 이어보려면 내 앨범에서 계정을 연결해 주세요.</p>
    </div>}
    <p className="photo-request-privacy">초대 링크는 7일간 유효해요. 링크를 가진 사람은 참여하고 공유된 사진을 볼 수 있으니, 함께 간 친구에게만 보내세요.</p>
  </section>;
}
