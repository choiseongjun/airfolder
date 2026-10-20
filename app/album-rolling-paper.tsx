'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown, Feather, ImagePlus, Send, Share2, Sparkles } from 'lucide-react';
import { api } from '@/lib/client-api';
import { IMAGE_LIMIT } from '@/lib/media-limits';
import { mapLimit } from '@/lib/parallel';
import PolicyGate from './policy-gate';
import { DecorationArt, RewardStickerPicker } from './reward-decoration';
import { REWARD_PHRASES, type RewardDecoration } from '@/lib/reward-decoration';
import './album-rolling-paper.css';

type Note = { id: string; body: string; author: string; mine: boolean; createdAt: string; photos: PhotoOption[]; sticker?: RewardDecoration | null };
type PhotoOption = { id: string; name: string; mediaType: 'image' | 'video'; src: string; createdAt: string };

export default function AlbumRollingPaper({ folderId, title, locale, canInvite, initiallyOpen = false, rewardsEnabled = false }: { folderId: string; title: string; locale: 'ko' | 'en'; canInvite: boolean; initiallyOpen?: boolean; rewardsEnabled?: boolean }) {
  const ko = locale === 'ko';
  const [notes, setNotes] = useState<Note[]>([]);
  const [photoOptions, setPhotoOptions] = useState<PhotoOption[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [sticker, setSticker] = useState<RewardDecoration | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [open, setOpen] = useState(initiallyOpen);
  const [error, setError] = useState('');
  const uploadInput = useRef<HTMLInputElement>(null);

  async function reload() {
    const result = await api<{ notes: (Note & { photos: PhotoOption[] })[]; photoOptions: PhotoOption[] }>(`/api/rolling-paper?folderId=${encodeURIComponent(folderId)}`);
    setNotes(result.notes);
    setPhotoOptions(result.photoOptions);
  }
  useEffect(() => {
    if (!open) return;
    let active = true;
    api<{ notes: (Note & { photos: PhotoOption[] })[]; photoOptions: PhotoOption[] }>(`/api/rolling-paper?folderId=${encodeURIComponent(folderId)}`)
      .then(result => { if (active) { setNotes(result.notes); setPhotoOptions(result.photoOptions); } })
      .catch(() => { if (active) setError(ko ? '롤링페이퍼를 불러오지 못했어요.' : 'Could not load the rolling paper.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [folderId, ko, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim() || (sticker?.phrase ? REWARD_PHRASES[sticker.phrase][ko ? 'ko' : 'en'] : '');
    if (!message || posting) return;
    setPosting(true); setError('');
    try {
      await api('/api/rolling-paper', { method: 'POST', body: JSON.stringify({ folderId, id: crypto.randomUUID(), body: message, photoIds: selectedPhotos, sticker }) });
      setDraft('');
      setSticker(null);
      setSelectedPhotos([]);
      setPickerOpen(false);
      await reload();
    } catch {
      setError(ko ? '메시지를 남기지 못했어요. 약관 동의 상태와 연결을 확인해 주세요.' : 'Could not save the note. Check your terms acceptance and connection.');
    } finally { setPosting(false); }
  }

  async function inviteFriends() {
    if (sharing) return;
    setSharing(true); setError('');
    try {
      const result = await api<{ token: string }>('/api/invites', { method: 'POST', body: JSON.stringify({ folderId }) });
      const url = `${window.location.origin}/join/${result.token}?lang=${locale}&next=rolling`;
      const text = ko ? `앨범에 롤링페이퍼 한마디 남겨줘 💌\n${url}` : `Leave us a note in our album 💌\n${url}`;
      if (navigator.share) {
        try { await navigator.share({ title, text, url }); }
        catch (cause) { if (cause instanceof Error && cause.name !== 'AbortError') await navigator.clipboard.writeText(text); }
      } else {
        await navigator.clipboard.writeText(text);
        setError(ko ? '초대 링크를 복사했어요. 단체 채팅에 붙여넣어 주세요.' : 'Invite link copied. Paste it into your group chat.');
      }
    } catch {
      setError(ko ? '초대 링크를 만들지 못했어요. 앨범 소유자 계정인지 확인해 주세요.' : 'Could not create an invite. Check that you own this album.');
    } finally { setSharing(false); }
  }

  async function addPhotos(files: File[]) {
    const allowed = files.filter(file => file.size > 0 && file.size <= IMAGE_LIMIT && (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name)));
    const available = 4 - selectedPhotos.length;
    const chosen = allowed.slice(0, available);
    const skipped = chosen.length < files.length;
    if (!chosen.length) { setError(ko ? '사진은 장당 20MB까지, 한 쪽지에 최대 4장까지 붙일 수 있어요.' : 'Photos must be under 20 MB, with up to 4 per note.'); return; }
    setUploadingPhotos(true); setError('');
    const uploaded: string[] = [];
    try {
      await mapLimit(chosen, 2, async file => {
        const id = crypto.randomUUID(), form = new FormData();
        form.set('id', id); form.set('folderId', folderId); form.set('file', file, file.name); form.set('name', file.name);
        form.set('created', String(Math.min(Date.now(), file.lastModified || Date.now()))); form.set('shared', 'true');
        await api('/api/photos', { method: 'POST', body: form });
        uploaded.push(id);
      });
      await reload();
      setSelectedPhotos(current => [...current, ...uploaded].slice(0, 4));
      setPickerOpen(true);
      if (skipped) setError(ko ? '조건에 맞지 않거나 4장을 넘은 사진은 제외했어요.' : 'Some photos were skipped because of size, format, or the 4-photo limit.');
    } catch {
      if (uploaded.length) { await reload().catch(() => {}); setSelectedPhotos(current => [...current, ...uploaded].slice(0, 4)); }
      setError(ko ? '일부 사진을 추가하지 못했어요. 사진 형식과 용량을 확인해 주세요.' : 'Some photos could not be added. Check their format and size.');
    } finally { setUploadingPhotos(false); }
  }

  return <details className="album-rolling-paper" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="arp-summary">
      <span className="arp-summary-icon"><Sparkles size={15}/></span>
      <span className="arp-summary-copy"><span>{ko ? '앨범에 남긴 마음' : 'ALBUM NOTES'}</span><strong>{ko ? '사진과 쪽지 모아보기' : 'Photos & notes'}</strong></span>
      <span className="arp-count">{notes.length} {ko ? '개' : notes.length === 1 ? 'note' : 'notes'}</span>
      <ChevronDown className="arp-chevron" size={18} aria-hidden="true"/>
    </summary>
    {open && <div className="arp-expanded">
    <PolicyGate ko={ko}/>
    <header className="arp-heading">
      <h2 id="album-rolling-title">{ko ? '우리에게 남기는 말' : 'Notes for us'}</h2>
      <p>{ko ? `${title}의 사진을 보며 서로에게 짧은 마음을 남겨요.` : `Leave a little note for each other while looking through ${title}.`}</p>
      {canInvite && <button type="button" className="arp-invite" onClick={() => void inviteFriends()} disabled={sharing}><Share2 size={14}/>{sharing ? (ko ? '초대 링크 준비 중…' : 'Preparing invite…') : (ko ? '친구 초대하기' : 'Invite friends')}</button>}
    </header>

    <form className="arp-compose" onSubmit={submit}>
      <label htmlFor="arp-draft"><Feather size={16}/>{ko ? '한마디 적어둘까요?' : 'Leave a little note'}</label>
      <textarea id="arp-draft" maxLength={500} value={draft} onChange={event => setDraft(event.target.value)} placeholder={ko ? '그날 고마웠던 순간이나, 친구에게 전하고 싶은 말을 적어보세요.' : 'Write about a moment you loved, or something you want a friend to know.'}/>
      <div className="arp-photo-tools">
        <button type="button" className="arp-photo-toggle" onClick={() => setPickerOpen(open => !open)} aria-expanded={pickerOpen}><ImagePlus size={14}/>{ko ? '사진 붙이기' : 'Add photos'}{selectedPhotos.length ? ` · ${selectedPhotos.length}` : ''}</button>
        <button type="button" className="arp-photo-upload" onClick={() => uploadInput.current?.click()} disabled={uploadingPhotos}>{uploadingPhotos ? (ko ? '사진 올리는 중…' : 'Uploading…') : (ko ? '기기에서 사진 추가' : 'Upload photos')}</button>
        <small>{ko ? '사진 없이 글만 남겨도 돼요' : 'A note can be text-only'}</small>
        <input ref={uploadInput} hidden type="file" accept="image/*,.heic,.heif" multiple onChange={event => { void addPhotos(Array.from(event.currentTarget.files || [])); event.currentTarget.value = ''; }}/>
      </div>
      {pickerOpen && <div className="arp-photo-picker" aria-label={ko ? '앨범 사진 선택' : 'Choose album photos'}>
        {photoOptions.length ? photoOptions.map(photo => {
          const selected = selectedPhotos.includes(photo.id);
          return <button key={photo.id} type="button" className={selected ? 'is-selected' : ''} aria-pressed={selected} aria-label={photo.name || (ko ? '앨범 사진' : 'Album photo')} onClick={() => setSelectedPhotos(current => selected ? current.filter(id => id !== photo.id) : current.length < 4 ? [...current, photo.id] : current)}>
            {photo.mediaType === 'video' ? <video src={photo.src} muted playsInline preload="metadata"/> : <img src={photo.src} alt={photo.name}/>}<span>{selected ? '✓' : '+'}</span>
          </button>;
        }) : <p>{ko ? '아직 모든 멤버에게 공개된 사진이 없어요. 사진 서랍에서 사진을 공개한 뒤 골라주세요.' : 'No photos are shared with everyone yet. Share photos in the drawer, then choose them here.'}<a href={`/?lang=${locale}&album=${encodeURIComponent(folderId)}&view=photos`}>{ko ? '사진 서랍 열기' : 'Open photo drawer'} →</a></p>}
        {photoOptions.length > 0 && <small>{ko ? '앨범 멤버 전체에 공개된 사진만 보여요 · 최대 4장' : 'Only photos shared with all members · up to 4'}</small>}
      </div>}
      {selectedPhotos.length > 0 && <div className="arp-selected-photos">{selectedPhotos.map(id => { const photo = photoOptions.find(item => item.id === id); return photo ? photo.mediaType === 'video' ? <video key={id} src={photo.src} muted playsInline/> : <img key={id} src={photo.src} alt={photo.name}/> : null; })}</div>}
      {rewardsEnabled && <RewardStickerPicker folderId={folderId} ko={ko} value={sticker} onChange={setSticker} disabled={posting || uploadingPhotos}/>}
      <div className="arp-compose-foot"><small>{draft.length}/500 · {ko ? '사진은 앨범 멤버 전체에게 공개돼요' : 'Photos are visible to all album members'}</small><button disabled={posting || uploadingPhotos || (!draft.trim() && !sticker?.phrase)}><Send size={14}/>{posting ? (ko ? '남기는 중…' : 'Saving…') : (ko ? '남기기' : 'Post note')}</button></div>
      {error && <p className="arp-error" role="alert">{error}</p>}
    </form>

    <div className="arp-notes" aria-live="polite">
      {loading ? <p className="arp-empty">{ko ? '친구들의 마음을 모으는 중…' : 'Gathering everyone’s notes…'}</p>
        : notes.length ? notes.map((note, index) => <article key={note.id} className={`arp-note arp-note-${index % 4}`}>
          <span className="arp-tape" aria-hidden="true"/>
          {note.sticker && <DecorationArt value={note.sticker} ko={ko}/>}
          {(!note.sticker?.phrase || note.body !== REWARD_PHRASES[note.sticker.phrase][ko ? 'ko' : 'en']) && <p>{note.body}</p>}
          {note.photos?.length > 0 && <div className={`arp-note-photos ${note.photos.length > 1 ? 'has-many' : ''}`}>{note.photos.map(photo => photo.mediaType === 'video' ? <video key={photo.id} src={photo.src} muted playsInline controls/> : <img key={photo.id} src={photo.src} alt={photo.name || (ko ? '롤링페이퍼 사진' : 'Rolling-paper photo')}/>)}</div>}
          <footer><span>{note.author}{note.mine && (ko ? ' · 나' : ' · You')}</span><time dateTime={note.createdAt}>{new Intl.DateTimeFormat(ko ? 'ko-KR' : 'en', { month: 'short', day: 'numeric' }).format(new Date(note.createdAt))}</time></footer>
        </article>)
        : <p className="arp-empty">{ko ? '아직 첫 쪽지가 없어요. 먼저 한마디를 남겨보세요 ✨' : 'No notes yet. Leave the first one ✨'}</p>}
    </div>
    </div>}
  </details>;
}
