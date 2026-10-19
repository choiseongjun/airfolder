'use client';
/* eslint-disable @next/next/no-img-element -- Thumbnails are local object URLs of photos not uploaded yet. */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ImagePlus, LockKeyhole, Upload, Users } from 'lucide-react';
import { api, initializeSession } from '@/lib/client-api';
import { IMAGE_LIMIT } from '@/lib/media-limits';
import { TERMS_VERSION } from '@/lib/policy';
import { trackClient } from '@/lib/growth-client';
import { uploadFailureReason } from '@/lib/growth-events';
import Consent from '../../../growth/consent';
import { Sticker } from '../../../theme-album';
import '../../../theme-album.css';
import '../../birthday/birthday.css';
import '../../../growth/cute.css';

type Invite = { name: string; kind: 'album' | 'group'; expiresAt: string; birthday?: boolean; day?: string | null; photos?: number | null; people?: number | null };
function dDay(day: string) { const now = new Date(), today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()); const left = Math.round((Date.parse(day + 'T00:00:00Z') - today) / 86400000); return left > 0 ? `D-${left}` : left === 0 ? 'D-DAY' : ''; }
type Album = { id: string; name: string };
type Item = { id: string; file: File; status: 'waiting' | 'uploading' | 'done' | 'failed'; error?: string; shared?: boolean; folder?: string; preview?: string };
export default function GuestFlow({ token, locale }: { token: string; locale: string }) {
  const ko = locale === 'ko', text = (a: string, b: string) => ko ? a : b;
  const [invite, setInvite] = useState<Invite | null>(null), [ready, setReady] = useState(false), [accepted, setAccepted] = useState(false), [consent, setConsent] = useState(false);
  const [joined, setJoined] = useState(false), [albums, setAlbums] = useState<Album[]>([]), [folder, setFolder] = useState(''), [group, setGroup] = useState('');
  const [items, setItems] = useState<Item[]>([]), [shared, setShared] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [retry, setRetry] = useState(0), [note, setNote] = useState(''), [nickname, setNickname] = useState('');
  const birthday = Boolean(invite?.birthday), router = useRouter();
  const uploading = useRef(false), staged = useRef<Item[]>([]);
  useEffect(() => { staged.current = items; }, [items]);
  // Thumbnails are object URLs; release them when the page goes away.
  useEffect(() => () => staged.current.forEach(i => i.preview && URL.revokeObjectURL(i.preview)), []);
  function remove(item: Item) { if (item.preview) URL.revokeObjectURL(item.preview); setItems(old => old.filter(i => i.id !== item.id)); }
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
  // Viewing an already-shared album carries no new data from the guest, so it skips the consent
  // gate that contributing a photo still needs.
  async function join(thenView = false) {
    if (!ready || busy || (!thenView && !accepted && !consent)) return;
    setBusy(true); setError('');
    try {
      if (!accepted) { await api('/api/policy', { method: 'POST', body: JSON.stringify({ version: TERMS_VERSION, accepted: true }) }); setAccepted(true); }
      const result = await api<{ folderId?: string; groupId?: string; albums: Album[] }>('/api/join', { method: 'POST', body: JSON.stringify({ token, name: nickname.trim() || undefined }) });
      // A shared album link should land on the decorated album itself, not the upload form.
      if (thenView && result.folderId) { router.push(`/?lang=${locale}&album=${result.folderId}&view=theme`); return; }
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
    setItems(old => [...old, ...valid.slice(0, available).map(item => ({ ...item, preview: URL.createObjectURL(item.file) }))]);
    setError(rejected || valid.length > available ? text('한 번에 사진 50장, 장당 20MB까지 선택할 수 있어요. 조건에 맞지 않는 파일은 제외했어요.', 'Choose up to 50 photos, 20 MB each. Unsupported or oversized files were skipped.') : '');
  }
  async function upload() {
    if (uploading.current || !folder) return;
    uploading.current = true; setBusy(true); setError('');
    const pending = items.filter(i => i.status === 'waiting' || i.status === 'failed');
    const completedIds: string[] = [];
    try {
      for (const item of pending) {
        // Retrying a staged upload must keep its original album and audience.
        const target = item.folder || folder, audience = item.shared ?? shared;
        setItems(old => old.map(i => i.id === item.id ? { ...i, status: 'uploading', folder: target, shared: audience, error: undefined } : i));
        void trackClient('upload_started', { source: 'guest', media_type: 'image', shared: audience }, target);
        const form = new FormData();
        form.set('id', item.id); form.set('folderId', target); form.set('file', item.file, item.file.name); form.set('name', item.file.name);
        form.set('created', String(Math.min(item.file.lastModified || Date.now(), Date.now()))); form.set('shared', String(audience));
        try { await api('/api/photos', { method: 'POST', body: form }); setItems(old => old.map(i => i.id === item.id ? { ...i, status: 'done' } : i)); completedIds.push(item.id); }
        catch (cause) {
          const reason = uploadFailureReason(cause instanceof Error ? cause.message : '');
          void trackClient('upload_failed', { source: 'guest', reason }, target);
          const message = reason === 'storage' ? text('저장 공간이 부족해요. 내 공간에서 용량을 확인해 주세요.', 'Storage is full. Check usage in My space.') : reason === 'format' ? text('읽을 수 없는 사진이에요. JPG나 PNG로 다시 선택해 주세요.', 'Could not read this photo. Try a JPG or PNG.') : text('전송하지 못했어요. 연결을 확인하고 다시 올려 주세요.', 'Upload failed. Check your connection and retry.');
          setItems(old => old.map(i => i.id === item.id ? { ...i, status: 'failed', error: message } : i));
        }
      }
      if (note.trim() && completedIds.length) {
        try {
          await api('/api/memories', { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), folderId: folder, title: '', body: note.trim(), day: new Date().toISOString().slice(0, 10), shared, photoIds: completedIds }) });
          setNote('');
        } catch { /* The photos are already saved even if the note could not be attached. */ }
      }
    } finally { uploading.current = false; setBusy(false); }
  }
  const completed = items.filter(i => i.status === 'done').length, pending = items.filter(i => i.status !== 'done').length;
  if (birthday && invite) {
    const countdown = invite.day ? dDay(invite.day) : '', sent = completed > 0 && !pending;
    // From the birthday on, the link is mostly opened to look, so viewing becomes the main action.
    const partyDay = Boolean(invite.day) && (!countdown || countdown === 'D-DAY') && !!invite.photos;
    // Birthday guests are on a phone, mid-chat: one screen, thumb-reach action, nothing to configure.
    return <main className="growth-page bday-flow cute-page"><nav className="growth-nav"><Link className="growth-brand" href={`/${locale}/hosts`}>memonestia.</Link></nav>
      <section className="bday-sheet">
        <span className="cute-deco cute-deco-a" aria-hidden="true"><Sticker kind="balloon" /></span>
        <div className="ta-album theme-birthday bday-hero" aria-hidden="true">
          <div className="ta-garland">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>
          <span className="ta-kicker">HAPPY BIRTHDAY</span>
        </div>
        <h1 className="bday-title">{invite.name}</h1>
        <p className="bday-sub">{countdown && <b>{countdown}</b>}{sent ? text('보냈어요! 생일날 한 권으로 공개돼요', 'Sent! It opens as one album on the day.') : text('주인공에겐 아직 비밀이에요', 'Keep it a secret for now.')}</p>
        {error && <p className="growth-error" role="alert">{error}</p>}
        {!ready && error && <button className="growth-button secondary" onClick={() => setRetry(n => n + 1)}>{text('다시 확인', 'Try again')}</button>}

        {!joined ? <div className="bday-step">
          <p className="bday-lead">{text('함께 찍은 사진 한 장이랑 한마디만 남겨주세요. 꾸미기는 자동이에요.', 'Add one photo of you two and a short note. Decorating is automatic.')}</p>
          <label className="growth-field">{text('내 이름', 'Your name')}<input maxLength={30} disabled={busy} value={nickname} onChange={e => setNickname(e.target.value)} placeholder={text('사진 옆에 같이 적혀요 · 예: 하윤', 'Shown with your photo · e.g. Hayun')} autoComplete="nickname" enterKeyHint="go" onKeyDown={e => { if (e.key === 'Enter') void join(); }} /></label>
          {!accepted && <Consent ko={ko} checked={consent} onChange={setConsent} />}
          {!!invite.photos && <button className="bday-more" disabled={!ready || busy || (partyDay && !accepted && !consent)} onClick={() => void join(!partyDay)}>{partyDay ? text('+ 나도 사진 보태기', '+ Add my photo too') : text(`지금까지 모인 앨범 보기 · 사진 ${invite.photos}장 →`, `See the album so far · ${invite.photos} photos →`)}</button>}
          <div className="bday-dock"><button className="growth-button" onClick={() => void join(partyDay)} disabled={!ready || busy || (!partyDay && !accepted && !consent)}>{busy ? text('여는 중…', 'Opening…') : partyDay ? text('완성된 생일 앨범 보기', 'Open the birthday album') : text('사진 고르러 가기', 'Choose a photo')}<ArrowRight size={18} /></button></div>
        </div> : sent ? <div className="bday-step bday-done">
          <div className="bday-thumbs">{items.map(item => <span key={item.id} className="bday-thumb">{item.preview && <img src={item.preview} alt="" />}<Check size={16} /></span>)}</div>
          <p className="bday-lead">{text('친구들 사진이 다 모이면 버스데이 테마 앨범으로 완성돼요.', 'Once everyone adds theirs, it becomes a Birthday Film album.')}</p>
          <label className="bday-more">{text('+ 사진 더 보내기', '+ Send more photos')}<input type="file" accept="image/*,.heic,.heif" multiple disabled={busy} onChange={e => { choose(e.target.files); e.target.value = ''; }} /></label>
          <div className="bday-dock"><Link className="growth-button" href={`/?lang=${locale}&album=${folder}&view=theme`}>{text('완성되는 앨범 미리보기', 'Peek at the album')}<ArrowRight size={18} /></Link></div>
        </div> : <div className="bday-step">
          <div className="bday-thumbs">
            {items.map(item => <span key={item.id} className={`bday-thumb is-${item.status}`}>{item.preview && <img src={item.preview} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />}
              {item.status === 'uploading' && <span className="bday-thumb-state">{text('올리는 중', 'Sending')}</span>}
              {item.status === 'failed' && <span className="bday-thumb-state">{text('다시 시도', 'Retry')}</span>}
              {item.status === 'done' && <Check size={16} />}
              {item.status !== 'uploading' && item.status !== 'done' && <button aria-label={text('사진 빼기', 'Remove photo')} disabled={busy} onClick={() => remove(item)}>×</button>}
            </span>)}
            {items.length < 50 && <label className="bday-thumb bday-add"><ImagePlus size={24} /><span>{items.length ? text('더 추가', 'Add') : text('사진 고르기', 'Choose')}</span><input aria-label={text('사진 선택', 'Choose photos')} type="file" accept="image/*,.heic,.heif" multiple disabled={busy || !folder} onChange={e => { choose(e.target.files); e.target.value = ''; }} /></label>}
          </div>
          {items.some(i => i.status === 'failed') && <p className="growth-error" role="alert">{items.find(i => i.error)?.error}</p>}
          <label className="growth-field">{text('생일 축하 한마디', 'A birthday note')}<textarea maxLength={300} rows={3} disabled={busy} value={note} onChange={e => setNote(e.target.value)} placeholder={text('예: 너랑 찍은 제일 웃긴 사진 ㅋㅋ 생일 축하해!', 'e.g. Our funniest photo together. Happy birthday!')} /></label>
          <div className="bday-dock"><button className="growth-button" disabled={busy || !folder || !pending} onClick={() => void upload()}>{busy ? text(`보내는 중 · ${completed}/${items.length}`, `Sending · ${completed}/${items.length}`) : !items.length ? text('사진을 먼저 골라주세요', 'Choose a photo first') : items.some(i => i.status === 'failed') ? text('남은 사진 다시 보내기', 'Retry remaining photos') : text(`사진 ${pending}장${note.trim() ? '이랑 한마디' : ''} 보내기`, `Send ${pending} photo${pending === 1 ? '' : 's'}${note.trim() ? ' & note' : ''}`)}<ArrowRight size={18} /></button>
            {busy && <small>{text('다 보낼 때까지 이 화면을 열어 두세요.', 'Keep this page open until it finishes.')}</small>}</div>
        </div>}
      </section></main>;
  }
  return <main className="growth-page cute-page"><nav className="growth-nav"><Link className="growth-brand" href={`/${locale}/hosts`}>memonestia.</Link><Link href={`/?lang=${locale}`}>{text('내 공간', 'My space')}</Link></nav>
    <section className="growth-card"><ol className="growth-steps"><li className={!joined ? 'current' : ''}>01 {text('모임 참여', 'Join')}</li><li className={joined && !completed ? 'current' : ''}>02 {text('사진 선택', 'Choose')}</li><li className={completed ? 'current' : ''}>03 {text('함께 보기', 'Enjoy')}</li></ol>
      <span className="cute-deco cute-deco-a" aria-hidden="true"><Sticker kind="sparkle" /></span><span className="cute-deco cute-deco-b" aria-hidden="true"><Sticker kind="heart" /></span>
      <div className="growth-icon cute-icon"><Sticker kind={completed ? 'star' : joined ? 'flower' : 'heart'} /></div>
      <p className="growth-eyebrow">YOUR VIEW MAKES THE MEMORY</p><h1>{invite?.name || (error ? text('초대를 열 수 없어요', 'Unable to open this invite') : text('모임 초대를 확인하고 있어요', 'Opening your invitation'))}</h1>
      {!joined && <p className="growth-lead">{birthday ? text('생일 주인공에게 줄 앨범이에요. 함께 찍은 사진 한 장과 한마디를 남겨주세요. 생일날 예쁜 앨범 한 권으로 완성돼요.', 'A birthday album for a friend. Add a photo of you two and a short note. It turns into a pretty album by the big day.') : text('당신이 찍은 순간도 보태주세요. 앱 설치나 새 계정 가입 없이, 고른 사진만 올릴 수 있어요.', 'Add your side of the story. No app installation or new account needed. Only the photos you choose are uploaded.')}</p>}
      {birthday && <div className="bday-guest"><strong>{invite?.day && dDay(invite.day) ? `${dDay(invite.day)} · ` : ''}{text('주인공에겐 아직 비밀이에요', 'Keep it a secret for now')}</strong>{text('올린 사진과 한마디는 버스데이 테마로 자동으로 꾸며져요. 꾸미기는 신경 쓰지 않아도 돼요.', 'Your photo and note are decorated in the Birthday Film theme automatically. No decorating needed.')}</div>}
      {error && <p className="growth-error" role="alert">{error}</p>}
      {!ready && error && <button className="growth-button secondary" onClick={() => setRetry(n => n + 1)}>{text('다시 확인', 'Try again')}</button>}
      {!joined && ready && <div className="growth-form">{invite?.kind === 'group' && <p className="growth-note">{text('참여하면 이 그룹의 기존·새 앨범에 접근할 수 있으며, 멤버에게 공유된 사진만 볼 수 있어요.', 'Joining gives access to existing and future group albums, and photos shared with members.')}</p>}
        {birthday && <label className="growth-field">{text('내 이름 (사진 옆에 같이 적혀요)', 'Your name (shown with your photo)')}<input maxLength={30} disabled={busy} value={nickname} onChange={e => setNickname(e.target.value)} placeholder={text('예: 하윤', 'e.g. Hayun')} /></label>}
        {!accepted && <Consent ko={ko} checked={consent} onChange={setConsent} />}
        {invite?.kind === 'album' && !!invite.photos && <><p className="growth-note">{text(`사진 ${invite.photos}장${invite.people && invite.people > 1 ? ` · ${invite.people}명이 채웠어요` : ''}. 열면 꾸민 앨범으로 바로 보여요.`, `${invite.photos} photos${invite.people && invite.people > 1 ? ` from ${invite.people} people` : ''}. It opens as a decorated album.`)}</p>
          <button className="growth-button" onClick={() => void join(true)} disabled={busy}>{busy ? text('여는 중…', 'Opening…') : text('앨범 보기', 'Open the album')}<ArrowRight size={18} /></button></>}
        <button className={`growth-button${invite?.kind === 'album' && invite.photos ? ' secondary' : ''}`} onClick={() => void join()} disabled={busy || (!accepted && !consent)}>{busy ? text('참여 중…', 'Joining…') : invite?.kind === 'album' && invite.photos ? text('내 사진도 보태기', 'Add my photos too') : text('참여하고 사진 고르기', 'Join & choose photos')}<ArrowRight size={18} /></button>
        <p className="growth-note">{text('링크를 받은 모임 멤버만 참여해 주세요. 초대 링크는 7일간 유효합니다.', 'Please join only if invited by the organizer. Invitations last 7 days.')}</p></div>}
      {joined && <>{albums.length > 1 && <label className="growth-field">{text('사진을 올릴 앨범', 'Choose an album')}<select disabled={busy || items.some(i => i.folder)} value={folder} onChange={e => setFolder(e.target.value)}><option value="">{text('앨범을 선택해 주세요', 'Select an album')}</option>{albums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
        {!albums.length ? <p className="growth-success">{text('모임에 참여했어요. 아직 앨범이 없으니 모임장에게 앨범을 만들어 달라고 요청해 주세요.', 'You joined! Ask your organizer to create the first album, then open this invite again.')}</p> : <>
          <p className="growth-note">{text('사진을 골라 아래 버튼을 누르면 업로드됩니다. 사진 한 장당 20MB까지, 한 번에 50장.', 'Choose photos, then press the upload button. Up to 50 photos, 20 MB each.')}</p>
          <label className="growth-upload-zone"><ImagePlus size={30} /><strong>{text('함께 남길 사진 고르기', 'Choose photos to keep together')}</strong><input aria-label={text('사진 선택', 'Choose photos')} type="file" accept="image/*,.heic,.heif" multiple disabled={busy || !folder || items.length >= 50} onChange={e => { choose(e.target.files); e.target.value = ''; }} /></label>
          {items.length > 0 && <><div className="growth-options" role="group" aria-label={text('사진 공개 범위', 'Photo audience')}><label><input type="radio" name="audience" checked={shared} disabled={busy} onChange={() => setShared(true)} /><Users size={15} />{text('앨범 멤버에게 공유', 'Share with album members')}</label><label><input type="radio" name="audience" checked={!shared} disabled={busy} onChange={() => setShared(false)} /><LockKeyhole size={15} />{text('나만 보기', 'Only me')}</label></div>
            <label className="growth-field">{birthday ? text('생일 축하 한마디', 'A birthday note') : text('한마디 남기기 (선택)', 'Leave a note (optional)')}<textarea maxLength={300} disabled={busy} value={note} onChange={e => setNote(e.target.value)} placeholder={birthday ? text('예: 너랑 찍은 제일 웃긴 사진 ㅋㅋ 생일 축하해!', 'e.g. Our funniest photo together. Happy birthday!') : text('이 사진들과 함께 남길 말이 있나요?', 'Anything you want to say with these photos?')} /></label>
            <ul className="growth-upload-list">{items.map(item => <li key={item.id}>{item.status === 'done' ? <Check size={18} /> : <Upload size={18} />}<span className="growth-file-name">{item.file.name}<small>{item.error || (item.status === 'done' ? text(item.shared ? '공유 완료' : '나만 보기로 저장 완료', item.shared ? 'Shared' : 'Saved privately') : item.status === 'uploading' ? text('올리는 중…', 'Uploading…') : text('전송 대기', 'Ready to upload'))}</small>{item.status === 'failed' && <small>{text('재시도는 처음 선택한 앨범·공개 범위를 유지해요.', 'Retries keep the original album and audience.')}</small>}</span>{item.status !== 'uploading' && <button disabled={busy} onClick={() => remove(item)}>{text(item.status === 'done' ? '목록에서 닫기' : '선택 취소', item.status === 'done' ? 'Dismiss' : 'Remove')}</button>}</li>)}</ul>
            {pending > 0 && <button className="growth-button" disabled={busy || !folder} onClick={() => void upload()}>{busy ? text(`올리는 중 · ${completed}/${items.length}장`, `Uploading · ${completed}/${items.length}`) : items.some(i => i.status === 'failed') ? text('남은 사진 다시 올리기', 'Retry remaining photos') : text(`${pending}장 ${shared ? '모임에 공유하며 올리기' : '나만 보기로 올리기'}`, `Upload ${pending} photos ${shared ? '& share' : 'privately'}`)}<ArrowRight size={17} /></button>}
            {pending > 0 && <p className="growth-note">{text('전송이 끝날 때까지 이 화면을 열어 두세요. 성공한 사진은 다시 전송하지 않습니다. 공개 범위는 새로 전송할 사진에 적용돼요.', 'Keep this page open until uploads finish. Completed photos are not uploaded again. Audience changes apply to new uploads.')}</p>}</>}
          {completed > 0 && <p className="growth-success" role="status">{text(`${completed}장의 사진을 보탰어요. 함께한 순간이 더 풍성해졌네요.`, `${completed} photos added. Your moments are now part of the story.`)}</p>}
        </>}
        <div className="growth-links">{!pending && <>{birthday && folder ? <Link className="growth-button" href={`/?lang=${locale}&album=${folder}&view=theme`}>{text('완성되는 앨범 미리보기', 'Peek at the album')}</Link> : <Link className="growth-button secondary" href={`/?lang=${locale}${folder ? `&album=${folder}&view=theme` : group ? `&group=${group}` : ''}`}>{text('모임 앨범 보기', 'View the album')}</Link>}<Link className="growth-button secondary" href={`/${locale}/hosts`}>{text('다음 모임은 내가 열어볼래요', 'Host my next gathering')}</Link></>}
          <p className="growth-note">{text('이 브라우저에 참여 정보가 저장됩니다. 나중에 다른 기기에서도 보려면 내 공간에서 계정을 연결해 주세요.', 'Your membership is saved in this browser. Connect an account in My space to return on another device.')}</p></div>
      </>}
    </section></main>;
}
