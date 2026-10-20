'use client';
/* eslint-disable @next/next/no-img-element -- Authorized photo content uses session cookies. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X, ArrowUpRight, Check, StickyNote } from 'lucide-react';
import { api } from '@/lib/client-api';
import { noteColors, type NoteColor, type NoteOptions } from '@/lib/comment-note';
import type { FeedItem } from './home-feed';

const palette = {
  cream: { label: '크림', paper: '#fff0be' },
  peach: { label: '살구', paper: '#ffdfcc' },
  sage: { label: '연두', paper: '#e2edce' },
  lavender: { label: '라벤더', paper: '#ebe2f4' },
};
type Note = FeedItem['comments'][number];
type Media = FeedItem['photos'][number];
function NoteCard({ note, photo, index }: { note: Note; photo?: Media; index: number }) {
  const color = palette[note.color ?? 'cream'] ?? palette.cream;
  return <article className="note-arrive relative min-w-0 rounded-sm p-4 pb-5 text-[#403329] shadow-[1px_4px_9px_#4c342218]" style={{ backgroundColor: color.paper, rotate: `${index % 2 ? 1.1 : -1.1}deg` }}>
    <span aria-hidden="true" className="absolute -top-1.5 left-5 h-3 w-10 -rotate-3 bg-white/55"/>
    <header className="mb-3 flex items-center gap-2">
      {photo && <img src={photo.src} alt="이 메모를 남긴 사진" className="h-9 w-9 shrink-0 rounded-sm border-2 border-white object-cover"/>}
      <div className="min-w-0"><strong className="block truncate text-xs">{note.author.mine ? '나' : note.author.name || '친구'}</strong><time dateTime={note.createdAt} className="text-[10px] text-[#6e6055]">{new Date(note.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</time></div>
    </header>
    <p className="whitespace-pre-wrap break-words text-[14px] leading-6">{note.body}</p>
    <span aria-hidden="true" className="absolute bottom-0 right-0 h-4 w-4 bg-black/5 [clip-path:polygon(100%_0,0_100%,100%_100%)]"/>
  </article>;
}
export default function PhotoNotes({ item, photo, onComment }: { item: FeedItem; photo?: Media; onComment: (item: FeedItem, body: string, options?: NoteOptions) => Promise<string | null> }) {
  const [draft, setDraft] = useState(''), [color, setColor] = useState<NoteColor>('cream');
  const [sending, setSending] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [open, setOpen] = useState(false), [notes, setNotes] = useState<Note[]>([]), [loading, setLoading] = useState(false), [more, setMore] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const node = dialog.current, trigger = document.activeElement as HTMLElement | null;
    node?.showModal();
    return () => { node?.close(); trigger?.focus(); };
  }, [open]);
  async function loadNotes(offset = 0) {
    setLoading(true); setError('');
    try {
      const result = await api<{ comments: { id: string; body: string; author: string; mine: boolean; createdAt: string; color?: NoteColor; photoId?: string }[]; hasMore: boolean }>(`/api/discussion?kind=${item.kind}&id=${item.id}&offset=${offset}`);
      const incoming = result.comments.map(note => ({ ...note, author: { id: note.id, name: note.author, mine: note.mine } }));
      setNotes(old => offset ? [...old, ...incoming] : incoming); setMore(result.hasMore);
    } catch { setError('메모를 불러오지 못했어요. 다시 눌러주세요.'); }
    finally { setLoading(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true); setError(''); setSuccess('');
    try {
      const problem = await onComment(item, draft.trim(), { color, photoId: photo?.id });
      if (problem) setError(problem);
      else { setDraft(''); setSuccess('메모를 붙였어요.'); }
    } catch { setError('메모를 붙이지 못했어요. 다시 시도해 주세요.'); }
    finally { setSending(false); }
  }
  const recent = item.comments.slice(-3);
  return <section aria-label="사진에 남긴 포스트잇" className="mt-4 rounded-2xl border border-[#eee2d6] bg-[#fcfaf6] p-3.5">
    <div className="mb-4 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#574334]"><StickyNote size={16}/>그날의 한마디 <span className="text-xs font-normal text-[#8c7868]">{item.commentCount}</span></h3>
      {item.commentCount > 0 && <button type="button" onClick={() => { setOpen(true); void loadNotes(); }} className="flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs text-[#92503a]">전체 보기<ArrowUpRight size={13}/></button>}
    </div>
    {recent.length ? <div className="mb-5 grid grid-cols-1 gap-4">{recent.map((note, i) => <NoteCard key={note.id} note={note} index={i} photo={item.photos.find(p => p.id === note.photoId)}/>)}</div>
      : <p className="mb-4 py-3 text-center text-xs leading-6 text-[#8c7868]">사진엔 안 담긴 이야기,<br/>첫 번째 메모로 남겨볼까요?</p>}
    <form onSubmit={submit} className="rounded-xl border border-[#e5d8c7] p-3 transition-colors" style={{ backgroundColor: palette[color].paper }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        {photo ? <span className="flex items-center gap-1.5 text-[11px] text-[#75614e]"><img src={photo.src} alt="" className="h-7 w-7 rounded border border-white object-cover"/>이 사진에 한마디</span> : <span className="text-xs text-[#75614e]">이 기록에 한마디</span>}
        <div role="group" aria-label="메모 색상" className="flex gap-1">{noteColors.map(value => <button key={value} type="button" aria-label={`${palette[value].label} 메모`} aria-pressed={color === value} onClick={() => setColor(value)} className="grid h-7 w-7 place-items-center rounded-full border border-[#8c7868]/30 text-[#574334] focus-visible:outline-2 focus-visible:outline-[#92503a]" style={{ backgroundColor: palette[value].paper }}>{color === value && <Check size={13}/>}</button>)}</div>
      </div>
      <textarea aria-label="포스트잇 댓글" placeholder="이날 기억나는 거 있어?" rows={2} maxLength={1000} value={draft} onChange={event => { setDraft(event.target.value); setSuccess(''); }} className="w-full resize-y bg-transparent text-sm leading-6 text-[#403329] placeholder:text-[#8b7764] focus:outline-hidden"/>
      <div className="mt-2 flex items-center justify-between"><span className="text-[10px] text-[#8b7764]">{draft.length}/1000</span><button disabled={sending || !draft.trim()} type="submit" className="rounded-full bg-[#92503a] px-4 py-2 text-xs font-semibold text-white transition-transform active:scale-95 disabled:opacity-40">{sending ? '붙이는 중…' : '메모 붙이기'}</button></div>
    </form>
    <p role="status" className="mt-1 text-xs text-[#596a46]">{success}</p>
    {error && !open && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    {open && <dialog ref={dialog} onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }} aria-labelledby={`notes-title-${item.id}`} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-[#e5d8c7] bg-[#fcfaf6] p-5 text-[#403329] shadow-2xl backdrop:bg-[#30251f]/45">
      <header className="mb-6 flex items-center justify-between"><div><h2 id={`notes-title-${item.id}`} className="text-lg font-semibold">그날의 한마디</h2><p className="mt-1 text-xs text-[#8b7764]">{item.album}</p></div><button autoFocus type="button" aria-label="메모 전체 보기 닫기" onClick={() => setOpen(false)} className="rounded-full bg-[#eee2d6] p-2"><X size={18}/></button></header>
      <div className="grid gap-5">{notes.map((note, i) => <NoteCard key={note.id} note={note} index={i} photo={note.photoId ? { id: note.photoId, src: `/api/photos/${note.photoId}/content`, video: false, day: null } : undefined}/>)}</div>
      {loading && <p role="status" className="py-5 text-center text-sm">메모를 가져오고 있어요…</p>}
      {error && <div role="alert" className="py-4 text-sm text-red-700">{error}<button type="button" onClick={() => void loadNotes(notes.length)} className="ml-2 underline">다시 시도</button></div>}
      {!loading && !error && !notes.length && <p className="py-5 text-center text-sm">아직 남겨진 메모가 없어요.</p>}
      {more && !loading && !error && <button type="button" onClick={() => void loadNotes(notes.length)} className="mt-5 w-full rounded-xl border border-[#e5d8c7] p-3 text-sm">메모 더 보기</button>}
    </dialog>}
  </section>;
}
