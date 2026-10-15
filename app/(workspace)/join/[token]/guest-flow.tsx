'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ImagePlus, Link2, LockKeyhole, Upload, Users } from 'lucide-react';
import { api, initializeSession } from '@/lib/client-api';
import { IMAGE_LIMIT } from '@/lib/media-limits';
import { TERMS_VERSION } from '@/lib/policy';
import { trackClient } from '@/lib/growth-client';
import { uploadFailureReason } from '@/lib/growth-events';
import Consent from '../../../growth/consent';

type Invite = { name: string; kind: 'album' | 'group'; expiresAt: string };
type Album = { id: string; name: string };
type Item = { id: string; file: File; status: 'waiting' | 'uploading' | 'done' | 'failed'; error?: string; shared?: boolean; folder?: string };
export default function GuestFlow({ token, locale }: { token: string; locale: string }) {
  const ko = locale === 'ko', text = (a: string, b: string) => ko ? a : b;
  const [invite, setInvite] = useState<Invite | null>(null), [ready, setReady] = useState(false), [accepted, setAccepted] = useState(false), [consent, setConsent] = useState(false);
  const [joined, setJoined] = useState(false), [albums, setAlbums] = useState<Album[]>([]), [folder, setFolder] = useState(''), [group, setGroup] = useState('');
  const [items, setItems] = useState<Item[]>([]), [shared, setShared] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const uploading = useRef(false);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!/^[a-f\d]{64}$/.test(token)) throw new Error('INVALID_INVITE');
        await initializeSession();
        const [preview, policy] = await Promise.all([api<Invite>('/api/join/preview', { method: 'POST', body: JSON.stringify({ token }) }), api<{ accepted: boolean }>('/api/policy')]);
        if (active) { setInvite(preview); setAccepted(policy.accepted); setReady(true); setError(''); }
      } catch (cause) { if (active) setError(cause instanceof Error && /INVITE/.test(cause.message) ? (ko ? '초대가 만료되었거나 취소되었어요. 모임장에게 새 링크를 요청해 주세요.' : 'This invite expired or was revoked. Ask the organizer for a new link.') : (ko ? '연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.' : 'Could not connect. Check your connection and try again.')); }
    }
    void load(); return () => { active = false; };
  }, [token, ko, retry]);
  useEffect(() => {
    if (!items.some(item => item.status !== 'done')) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [items]);
  async function join() {
    if (!ready || busy || (!accepted && !consent)) return;
    setBusy(true); setError('');
    try {
      if (!accepted) { await api('/api/policy', { method: 'POST', body: JSON.stringify({ version: TERMS_VERSION, accepted: true }) }); setAccepted(true); }
      const result = await api<{ folderId?: string; groupId?: string; albums: Album[] }>('/api/join', { method: 'POST', body: JSON.stringify({ token }) });
      setAlbums(result.albums); setFolder(result.folderId || (result.albums.length === 1 ? result.albums[0].id : '')); setGroup(result.groupId || ''); setJoined(true);
    } catch (cause) { setError(cause instanceof Error && /INVITE/.test(cause.message) ? text('초대가 만료되었어요. 모임장에게 새 링크를 요청해 주세요.', 'The invite expired. Ask the organizer for a new link.') : text('참여하지 못했어요. 모임 정원이나 연결 상태를 확인하고 다시 시도해 주세요.', 'Could not join. Check the group capacity or your connection and try again.')); }
    finally { setBusy(false); }
  }
  function choose(files: FileList | null) {
    if (!files || busy) return;
    const chosen = Array.from(files), valid: Item[] = [];
    let rejected = false;
    for (const file of chosen) {
      if (!file.size || file.size > IMAGE_LIMIT || !(file.type.startsWith('image/') || /\.(heic|heif|jpg|jpeg|png|webp|gif|avif)$/i.test(file.name))) { rejected = true; continue; }
      if (items.some(i => i.file.name === file.name && i.file.size === file.size && i.file.lastModified === file.lastModified)) continue;
      valid.push({ id: crypto.randomUUID(), file, status: 'waiting' });
    }
    const available = 50 - items.length;
    setItems(old => [...old, ...valid.slice(0, available)]);
    setError(rejected || valid.length > available ? text('한 번에 사진 50장, 장당 20MB까지 선택할 수 있어요. 조건에 맞지 않는 파일은 제외했어요.', 'Choose up to 50 photos, 20 MB each. Unsupported or oversized files were skipped.') : '');
  }
  async function upload() {
    if (uploading.current || !folder) return;
    uploading.current = true; setBusy(true); setError('');
    const pending = items.filter(i => i.status === 'waiting' || i.status === 'failed');
    try {
      for (const item of pending) {
        // Retrying a staged upload must keep its original album and audience.
        const target = item.folder || folder, audience = item.shared ?? shared;
        setItems(old => old.map(i => i.id === item.id ? { ...i, status: 'uploading', folder: target, shared: audience, error: undefined } : i));
        void trackClient('upload_started', { source: 'guest', media_type: 'image', shared: audience }, target);
        const form = new FormData();
        form.set('id', item.id); form.set('folderId', target); form.set('file', item.file, item.file.name); form.set('name', item.file.name);
        form.set('created', String(Math.min(item.file.lastModified || Date.now(), Date.now()))); form.set('shared', String(audience));
        try { await api('/api/photos', { method: 'POST', body: form }); setItems(old => old.map(i => i.id === item.id ? { ...i, status: 'done' } : i)); }
        catch (cause) {
          const reason = uploadFailureReason(cause instanceof Error ? cause.message : '');
          void trackClient('upload_failed', { source: 'guest', reason }, target);
          const message = reason === 'storage' ? text('저장 공간이 부족해요. 내 공간에서 용량을 확인해 주세요.', 'Storage is full. Check usage in My space.') : reason === 'format' ? text('읽을 수 없는 사진이에요. JPG나 PNG로 다시 선택해 주세요.', 'Could not read this photo. Try a JPG or PNG.') : text('전송하지 못했어요. 연결을 확인하고 다시 올려 주세요.', 'Upload failed. Check your connection and retry.');
          setItems(old => old.map(i => i.id === item.id ? { ...i, status: 'failed', error: message } : i));
        }
      }
    } finally { uploading.current = false; setBusy(false); }
  }
  const completed = items.filter(i => i.status === 'done').length, pending = items.filter(i => i.status !== 'done').length;
  return <main className="growth-page"><nav className="growth-nav"><Link className="growth-brand" href={`/${locale}/hosts`}>memonestia.</Link><Link href={`/?lang=${locale}`}>{text('내 공간', 'My space')}</Link></nav>
    <section className="growth-card"><ol className="growth-steps"><li className={!joined ? 'current' : ''}>01 {text('모임 참여', 'Join')}</li><li className={joined && !completed ? 'current' : ''}>02 {text('사진 선택', 'Choose')}</li><li className={completed ? 'current' : ''}>03 {text('함께 보기', 'Enjoy')}</li></ol>
      <div className="growth-icon">{completed ? <Check /> : joined ? <ImagePlus /> : <Link2 />}</div>
      <p className="growth-eyebrow">YOUR VIEW MAKES THE MEMORY</p><h1>{invite?.name || (error ? text('초대를 열 수 없어요', 'Unable to open this invite') : text('모임 초대를 확인하고 있어요', 'Opening your invitation'))}</h1>
      {!joined && <p className="growth-lead">{text('당신이 찍은 순간도 보태주세요. 앱 설치나 새 계정 가입 없이, 고른 사진만 올릴 수 있어요.', 'Add your side of the story. No app installation or new account needed. Only the photos you choose are uploaded.')}</p>}
      {error && <p className="growth-error" role="alert">{error}</p>}
      {!ready && error && <button className="growth-button secondary" onClick={() => setRetry(n => n + 1)}>{text('다시 확인', 'Try again')}</button>}
      {!joined && ready && <div className="growth-form">{invite?.kind === 'group' && <p className="growth-note">{text('참여하면 이 그룹의 기존·새 앨범에 접근할 수 있으며, 멤버에게 공유된 사진만 볼 수 있어요.', 'Joining gives access to existing and future group albums, and photos shared with members.')}</p>}
        {!accepted && <Consent ko={ko} checked={consent} onChange={setConsent} />}
        <button className="growth-button" onClick={() => void join()} disabled={busy || (!accepted && !consent)}>{busy ? text('참여 중…', 'Joining…') : text('참여하고 사진 고르기', 'Join & choose photos')}<ArrowRight size={18} /></button>
        <p className="growth-note">{text('링크를 받은 모임 멤버만 참여해 주세요. 초대 링크는 7일간 유효합니다.', 'Please join only if invited by the organizer. Invitations last 7 days.')}</p></div>}
      {joined && <>{albums.length > 1 && <label className="growth-field">{text('사진을 올릴 앨범', 'Choose an album')}<select disabled={busy || items.some(i => i.folder)} value={folder} onChange={e => setFolder(e.target.value)}><option value="">{text('앨범을 선택해 주세요', 'Select an album')}</option>{albums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
        {!albums.length ? <p className="growth-success">{text('모임에 참여했어요. 아직 앨범이 없으니 모임장에게 앨범을 만들어 달라고 요청해 주세요.', 'You joined! Ask your organizer to create the first album, then open this invite again.')}</p> : <>
          <p className="growth-note">{text('사진을 골라 아래 버튼을 누르면 업로드됩니다. 사진 한 장당 20MB까지, 한 번에 50장.', 'Choose photos, then press the upload button. Up to 50 photos, 20 MB each.')}</p>
          <label className="growth-upload-zone"><ImagePlus size={30} /><strong>{text('함께 남길 사진 고르기', 'Choose photos to keep together')}</strong><input aria-label={text('사진 선택', 'Choose photos')} type="file" accept="image/*,.heic,.heif" multiple disabled={busy || !folder || items.length >= 50} onChange={e => { choose(e.target.files); e.target.value = ''; }} /></label>
          {items.length > 0 && <><div className="growth-options" role="group" aria-label={text('사진 공개 범위', 'Photo audience')}><label><input type="radio" name="audience" checked={shared} disabled={busy} onChange={() => setShared(true)} /><Users size={15} />{text('앨범 멤버에게 공유', 'Share with album members')}</label><label><input type="radio" name="audience" checked={!shared} disabled={busy} onChange={() => setShared(false)} /><LockKeyhole size={15} />{text('나만 보기', 'Only me')}</label></div>
            <ul className="growth-upload-list">{items.map(item => <li key={item.id}>{item.status === 'done' ? <Check size={18} /> : <Upload size={18} />}<span className="growth-file-name">{item.file.name}<small>{item.error || (item.status === 'done' ? text(item.shared ? '공유 완료' : '나만 보기로 저장 완료', item.shared ? 'Shared' : 'Saved privately') : item.status === 'uploading' ? text('올리는 중…', 'Uploading…') : text('전송 대기', 'Ready to upload'))}</small>{item.status === 'failed' && <small>{text('재시도는 처음 선택한 앨범·공개 범위를 유지해요.', 'Retries keep the original album and audience.')}</small>}</span>{item.status !== 'uploading' && <button disabled={busy} onClick={() => setItems(old => old.filter(i => i.id !== item.id))}>{text(item.status === 'done' ? '목록에서 닫기' : '선택 취소', item.status === 'done' ? 'Dismiss' : 'Remove')}</button>}</li>)}</ul>
            {pending > 0 && <button className="growth-button" disabled={busy || !folder} onClick={() => void upload()}>{busy ? text(`올리는 중 · ${completed}/${items.length}장`, `Uploading · ${completed}/${items.length}`) : items.some(i => i.status === 'failed') ? text('남은 사진 다시 올리기', 'Retry remaining photos') : text(`${pending}장 ${shared ? '모임에 공유하며 올리기' : '나만 보기로 올리기'}`, `Upload ${pending} photos ${shared ? '& share' : 'privately'}`)}<ArrowRight size={17} /></button>}
            {pending > 0 && <p className="growth-note">{text('전송이 끝날 때까지 이 화면을 열어 두세요. 성공한 사진은 다시 전송하지 않습니다. 공개 범위는 새로 전송할 사진에 적용돼요.', 'Keep this page open until uploads finish. Completed photos are not uploaded again. Audience changes apply to new uploads.')}</p>}</>}
          {completed > 0 && <p className="growth-success" role="status">{text(`${completed}장의 사진을 보탰어요. 함께한 순간이 더 풍성해졌네요.`, `${completed} photos added. Your moments are now part of the story.`)}</p>}
        </>}
        <div className="growth-links">{!pending && <><Link className="growth-button secondary" href={`/?lang=${locale}${folder ? `&room=${folder}` : group ? `&group=${group}` : ''}`}>{text('모임 앨범 보기', 'View the album')}</Link><Link className="growth-button secondary" href={`/${locale}/hosts`}>{text('다음 모임은 내가 열어볼래요', 'Host my next gathering')}</Link></>}
          <p className="growth-note">{text('이 브라우저에 참여 정보가 저장됩니다. 나중에 다른 기기에서도 보려면 내 공간에서 계정을 연결해 주세요.', 'Your membership is saved in this browser. Connect an account in My space to return on another device.')}</p></div>
      </>}
    </section></main>;
}
