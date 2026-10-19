'use client';
/* eslint-disable @next/next/no-img-element -- The preview is a local object URL of the rendered story image. */
import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Link2, MessageCircle, Video, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { shareToKakao } from '@/lib/kakao-share';
import { renderStory, type StoryTheme } from '@/lib/story-image';
import { renderStoryVideo } from '@/lib/story-video';
import './album-share.css';

type Props = { folderId: string; title: string; theme: StoryTheme; photos: string[]; people: string[]; day: string; locale: 'ko' | 'en'; canInvite: boolean; message: (url: string) => string; onClose: () => void };

/** One sheet for every place people actually share: KakaoTalk, Instagram stories, Threads, or a plain link. */
export default function AlbumShare({ folderId, title, theme, photos, people, day, locale, canInvite, message, onClose }: Props) {
 const ko = locale === 'ko', t = (a: string, b: string) => ko ? a : b;
 const canvas = useRef<HTMLCanvasElement>(null);
 const [image, setImage] = useState<Blob | null>(null), [preview, setPreview] = useState(''), [link, setLink] = useState(''), [note, setNote] = useState(''), [busy, setBusy] = useState('');
 const [makingVideo, setMakingVideo] = useState(false), [videoProgress, setVideoProgress] = useState(0);
 useEffect(() => {
  let active = true, url = '';
  if (canvas.current) renderStory(canvas.current, { theme, title, photos, people, day, ko })
   .then(blob => { if (!active) return; url = URL.createObjectURL(blob); setImage(blob); setPreview(url); })
   .catch(() => { if (active) setNote(t('이미지를 만들지 못했어요. 링크로 공유해 주세요.', 'Could not make the image. Share the link instead.')); });
  // Owners share the album's invite link; anyone else shares the site so friends can make their own.
  const ready = canInvite ? api<{ token: string }>('/api/invites', { method: 'POST', body: JSON.stringify({ folderId }) }).then(r => `${window.location.origin}/join/${r.token}?lang=${locale}`) : Promise.resolve(`${window.location.origin}/${locale}`);
  ready.then(value => { if (active) setLink(value); }).catch(() => { if (active) setLink(`${window.location.origin}/${locale}`); });
  return () => { active = false; if (url) URL.revokeObjectURL(url); };
 // eslint-disable-next-line react-hooks/exhaustive-deps -- Render the story and mint the link once per opened sheet.
 }, []);
 const text = link ? message(link) : '';
 const fileName = `memonestia-${theme}.jpg`;

 async function video() {
  if (makingVideo || !photos.length) return;
  setMakingVideo(true); setVideoProgress(0); setNote('');
  try {
   const result = await renderStoryVideo({ title, photos, day, ko }, setVideoProgress);
   const ext = result.mimeType.includes('mp4') ? 'mp4' : 'webm';
   const file = new File([result.blob], `memonestia-${theme}.${ext}`, { type: result.mimeType });
   // Phones offer Instagram Stories in the share sheet; elsewhere the clip is saved for upload.
   if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file] }); setNote(t('공유 창에서 Instagram → 스토리를 고르세요.', 'Pick Instagram → Story in the share sheet.')); } catch { /* Closing the sheet is fine. */ } return; }
   const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click();
   setNote(t('영상을 저장했어요. 인스타그램 스토리에서 올려주세요.', 'Video saved. Post it to your Instagram story.'));
  } catch { setNote(t('이 브라우저에서는 영상을 만들 수 없어요. 이미지로 공유해 주세요.', 'This browser can’t make a video here. Share the image instead.')); }
  finally { setMakingVideo(false); }
 }
 async function instagram() {
  if (!image) return;
  const file = new File([image], fileName, { type: 'image/jpeg' });
  // Phones offer Instagram Stories in the share sheet; elsewhere the image is saved for upload.
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file] }); setNote(t('공유 창에서 Instagram → 스토리를 고르세요.', 'Pick Instagram → Story in the share sheet.')); } catch { /* Closing the sheet is fine. */ } return; }
  const a = document.createElement('a'); a.href = preview; a.download = fileName; a.click();
  setNote(t('이미지를 저장했어요. 인스타그램 스토리에서 이 사진을 올려주세요.', 'Image saved. Post it to your Instagram story.'));
 }
 async function kakao() {
  if (!link) return; setBusy('kakao');
  try { await shareToKakao(link); }
  catch {
   if (navigator.share) { try { await navigator.share({ text }); } catch { /* Closing the sheet is fine. */ } }
   else { await copy(text, t('카카오톡을 열 수 없어 메시지를 복사했어요. 카톡에 붙여넣으세요.', 'Could not open KakaoTalk; the message is copied.')); }
  } finally { setBusy(''); }
 }
 function threads() {
  if (!text) return;
  // Threads' intent page turns emoji outside the basic plane (📸, 🎂) into "�", so leave them out.
  const plain = text.replace(/[\u{10000}-\u{10FFFF}]\uFE0F?[ \t]?/gu, '').replace(/^[ \t]+|[ \t]+$/gm, '');
  window.open(`https://www.threads.com/intent/post?text=${encodeURIComponent(plain)}`, '_blank', 'noopener,noreferrer');
  setNote(t('이미지도 같이 올리려면 "이미지 저장"으로 받아 첨부하세요.', 'To add the picture too, save the image and attach it.'));
 }
 async function copy(value: string, done: string) {
  try { await navigator.clipboard.writeText(value); setNote(done); } catch { setNote(t('직접 선택해서 복사해 주세요.', 'Select and copy it manually.')); }
 }
 async function more() {
  if (!text) return;
  const file = image ? new File([image], fileName, { type: 'image/jpeg' }) : null;
  try { await navigator.share(file && navigator.canShare?.({ files: [file], text }) ? { files: [file], text } : { text }); } catch { /* Closing the sheet is fine. */ }
 }

 return <div className="share-sheet-backdrop" role="dialog" aria-modal="true" aria-label={t('앨범 공유', 'Share album')} onClick={onClose}>
  <section className="share-sheet" onClick={e => e.stopPropagation()}>
   <header><strong>{t('앨범 공유하기', 'Share this album')}</strong><button aria-label={t('닫기', 'Close')} onClick={onClose}><X size={18} /></button></header>
   <div className="share-preview">{preview ? <img src={preview} alt={t('스토리 미리보기', 'Story preview')} /> : <span>{t('스토리 이미지를 만드는 중…', 'Making the story image…')}</span>}<canvas ref={canvas} hidden /></div>
   <div className="share-targets">
    <button className="share-kakao" disabled={!link || busy === 'kakao'} onClick={() => void kakao()}><span className="share-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2c-5.3 0-9.6 3.4-9.6 7.6 0 2.7 1.8 5.1 4.5 6.4l-1 3.6c-.1.3.3.6.6.4l4.3-2.8c.4 0 .8.1 1.2.1 5.3 0 9.6-3.4 9.6-7.7S17.3 3.2 12 3.2Z" /></svg></span>{t('카카오톡', 'KakaoTalk')}</button>
    <button className="share-instagram" disabled={!image} onClick={() => void instagram()}><span className="share-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" /></svg></span>{t('인스타 스토리', 'Instagram story')}</button>
    <button className="share-threads" disabled={!text} onClick={threads}><span className="share-icon"><MessageCircle size={20} /></span>{t('쓰레드', 'Threads')}</button>
    <button className="share-copy" disabled={!text} onClick={() => void copy(text, t('메시지와 링크를 복사했어요.', 'Message and link copied.'))}><span className="share-icon"><Link2 size={20} /></span>{t('링크 복사', 'Copy link')}</button>
   </div>
   <div className="share-secondary">
    <button disabled={!preview} onClick={() => { const a = document.createElement('a'); a.href = preview; a.download = fileName; a.click(); setNote(t('이미지를 저장했어요.', 'Image saved.')); }}><Download size={15} />{t('이미지 저장', 'Save image')}</button>
    <button disabled={!photos.length || makingVideo} onClick={() => void video()}><Video size={15} />{makingVideo ? t(`영상 만드는 중 ${Math.round(videoProgress * 100)}%`, `Making video ${Math.round(videoProgress * 100)}%`) : t('영상으로 저장', 'Save as video')}</button>
    {typeof navigator !== 'undefined' && 'share' in navigator && <button disabled={!text} onClick={() => void more()}><Copy size={15} />{t('다른 앱으로', 'More apps')}</button>}
   </div>
   {note && <p className="share-note" role="status">{note}</p>}
   {!canInvite && <p className="share-note">{t('앨범 링크는 앨범을 만든 사람만 보낼 수 있어요. 대신 나도 만들 수 있는 링크가 들어가요.', 'Only the album owner can send its link, so this shares a link to make your own.')}</p>}
  </section>
 </div>;
}
