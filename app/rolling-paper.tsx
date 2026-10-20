"use client";
/* eslint-disable @next/next/no-img-element -- Media URLs require the viewer's session. */
import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import type { FeedActions, FeedItem } from './home-feed';
import { Icon } from './stitch-kit';

export function RollingPaper({ item, photo, onComment }: {
  item: FeedItem;
  photo: FeedItem['photos'][number];
  onComment: FeedActions['onComment'];
}) {
  const [draft, setDraft] = useState('');
  const [sticker, setSticker] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const inputId = useId();
  const detail = item.kind === 'photo'
    ? `/?lang=ko&album=${encodeURIComponent(item.folderId)}&photo=${encodeURIComponent(item.id)}`
    : `/?lang=ko&album=${encodeURIComponent(item.folderId)}&view=photos`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = [draft.trim(), sticker].filter(Boolean).join(' ');
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const problem = await onComment(item, body);
      if (problem) setError(problem);
      else { setDraft(''); setSticker(''); }
    } catch {
      setError('메모를 붙이지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSending(false);
    }
  }

  return <section aria-label="사진 뒷면 롤링페이퍼" className="memory-flip-face rounded-xl bg-[#f4ead8] px-4 pb-4 pt-14 text-[#4a382b]">
    <header className="mb-6 text-center">
      <span className="text-[9px] font-semibold tracking-[.22em] text-[#95765b]">THE OTHER SIDE OF OUR MEMORY</span>
      <h3 className="stitch-serif mt-2 text-[23px] font-semibold">우리만의 롤링페이퍼</h3>
      <p className="mt-1.5 text-[11px] leading-5 text-[#806b59]">{item.kind === 'record' ? '이 기록에 함께 남긴 마음들' : '이 사진에 함께 남긴 마음들'} · {item.commentCount}개의 메모</p>
    </header>
    <figure className="relative mx-auto mb-7 w-[82%] -rotate-2 rounded-sm bg-white p-2.5 pb-4 shadow-[0_5px_16px_#68462920]">
      <span aria-hidden="true" className="absolute -top-2 left-1/2 h-5 w-20 -translate-x-1/2 rotate-3 bg-[#d8b77d]/65"/>
      {photo.video
        ? <video src={photo.src} controls playsInline preload="metadata" className="aspect-[4/3] w-full rounded-sm object-cover"/>
        : <img src={photo.src} alt={item.title || `${item.author.name}의 추억 사진`} className="aspect-[4/3] w-full rounded-sm object-cover"/>}
      <figcaption className="stitch-serif mt-3 text-center text-xs leading-5 break-words">{item.title || item.album}</figcaption>
    </figure>
    {item.body && <p className="mb-5 border-l-2 border-[#bfa282] pl-3 text-xs leading-6 whitespace-pre-line break-words">{item.body}</p>}
    <div className="grid grid-cols-2 items-start gap-3" aria-label="함께 붙인 포스트잇">
      {item.comments.map((note, index) => <article key={note.id} className={`min-w-0 rounded-sm p-3 shadow-[1px_3px_6px_#68462912] ${index % 3 === 0 ? '-rotate-2 bg-[#fff4bd]' : index % 3 === 1 ? 'rotate-2 bg-[#e0ead7]' : 'rotate-1 bg-[#f8ddd5]'}`}>
        <p className="stitch-serif text-[13px] leading-6 whitespace-pre-line break-words">{note.body}</p>
        <footer className="mt-3 border-t border-[#8c70451a] pt-2 text-[10px] text-[#806b59]">
          <b className="block truncate">From. {note.author.mine ? '나' : note.author.name}</b>
          <time dateTime={note.createdAt}>{new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(note.createdAt))}</time>
        </footer>
      </article>)}
    </div>
    {!item.comments.length && <div className="rounded-xl border border-dashed border-[#cdbb9e] px-4 py-6 text-center">
      <Icon name="edit_note" className="text-2xl text-[#ad8864]"/>
      <p className="stitch-serif mt-2 text-sm">아직 비어 있는 추억의 뒷면</p>
      <p className="mt-1 text-[11px] text-[#806b59]">그날의 한마디를 첫 포스트잇으로 붙여 주세요.</p>
    </div>}
    {item.commentCount > item.comments.length && <Link href={detail} className="mt-4 block text-center text-xs font-semibold text-[#99452c] underline underline-offset-4">메모 {item.commentCount}개 모두 보기</Link>}
    <form onSubmit={submit} className="mt-6 rounded-xl border border-[#e1d3bd] bg-[#fffaf1] p-3">
      <label htmlFor={inputId} className="flex items-center gap-1.5 text-xs font-semibold text-[#76593e]"><Icon name="draw" className="text-base"/>나의 포스트잇</label>
      <textarea id={inputId} value={draft} onChange={e => setDraft(e.target.value)} maxLength={990} disabled={sending} placeholder="사진을 보니 떠오르는 그날의 이야기…" rows={3} className="mt-2 block w-full resize-y rounded-lg border border-[#eadfce] bg-white p-3 text-xs leading-6 outline-none focus:ring-2 focus:ring-[#bf9061]"/>
      <div className="my-3 flex flex-wrap gap-1" role="group" aria-label="포스트잇에 붙일 스티커">
        {['🥐', '🍺', '💖', '✨', '🥹'].map(value => <button key={value} type="button" disabled={sending} aria-label={`${value} 스티커`} aria-pressed={sticker === value} onClick={() => setSticker(sticker === value ? '' : value)} className={`flex h-11 w-11 items-center justify-center rounded-full text-xl transition-colors ${sticker === value ? 'bg-[#f2d9b8] ring-2 ring-[#99452c]' : 'bg-white hover:bg-[#f5e9d8]'}`}>{value}</button>)}
      </div>
      <button type="submit" disabled={sending || (!draft.trim() && !sticker)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#99452c] px-3 py-3 text-xs font-semibold text-white disabled:opacity-50"><Icon name="sticky_note_2" className="text-base"/>{sending ? '메모 붙이는 중…' : '마음 한 조각 붙이기'}</button>
      {error && <p role="alert" className="mt-2 text-xs leading-5 text-[#a13d32]">{error}</p>}
    </form>
  </section>;
}
