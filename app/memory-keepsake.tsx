'use client';
/* eslint-disable @next/next/no-img-element -- Session-protected album images. */
import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import './memory-keepsake.css';

type Photo = { id: string; src: string; mediaType: string };
type Note = { id: string; author: string; body: string };
export function AlbumKeepsake({ folderId, title, ko }: { folderId: string; title: string; ko: boolean }) {
  const [data, setData] = useState<{ notes: Note[]; photoOptions: Photo[] } | null>(null);
  const [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api<{ notes: Note[]; photoOptions: Photo[] }>(`/api/rolling-paper?folderId=${encodeURIComponent(folderId)}`)
      .then(result => { if (active) { setData(result); setFailed(false); } })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [folderId, retry]);
  if (failed) return <p role="alert">{ko ? '추억 카드를 불러오지 못했어요.' : 'Could not load the card.'}<button onClick={() => setRetry(value => value + 1)}>{ko ? '다시 시도' : 'Retry'}</button></p>;
  return data ? <MemoryKeepsake title={title} photos={data.photoOptions} notes={data.notes} ko={ko}/> : <p role="status">{ko ? '함께 만든 추억 카드를 펼치는 중…' : 'Preparing your memory card…'}</p>;
}
export default function MemoryKeepsake({ title, photos, notes, ko }: { title: string; photos: Photo[]; notes: Note[]; ko: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const images = photos.filter(photo => photo.mediaType === 'image').slice(0, 4);
  const messages = notes.slice(0, 3);
  async function download() {
    setBusy(true); setError('');
    try {
      await document.fonts.ready;
      const loaded = await Promise.all(images.map(photo => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = photo.src;
      })));
      const photoHeight = loaded.length === 1 ? 540 : Math.ceil(loaded.length / 2) * 290;
      const notesTop = 230 + photoHeight + (loaded.length ? 30 : 0);
      const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = Math.max(760, notesTop + messages.length * 160 + 100);
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('CANVAS');
      ctx.fillStyle = '#fff8ed'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#99452c'; ctx.font = '22px sans-serif'; ctx.fillText('OUR LITTLE MEMORIES', 60, 70);
      function lines(value: string, x: number, y: number, width: number, height: number, max: number) {
        let line = '', row = 0;
        const chars = [...value.replace(/\s+/g, ' ')];
        for (let i = 0; i < chars.length; i++) {
          if (ctx!.measureText(line + chars[i]).width > width) {
            if (row === max - 1) { ctx!.fillText(line.slice(0, -1) + '…', x, y + row * height); return; }
            ctx!.fillText(line, x, y + row++ * height); line = '';
          }
          line += chars[i];
        }
        if (line) ctx!.fillText(line, x, y + row * height);
      }
      ctx.fillStyle = '#49362a'; ctx.font = 'bold 42px sans-serif'; lines(title, 60, 132, 960, 52, 2);
      loaded.forEach((img, i) => {
        const x = 60 + i % 2 * 490, y = 230 + Math.floor(i / 2) * 290, w = loaded.length === 1 ? 960 : 470, h = loaded.length === 1 ? 540 : 270;
        const scale = Math.max(w / img.width, h / img.height);
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.drawImage(img, x + (w - img.width * scale) / 2, y + (h - img.height * scale) / 2, img.width * scale, img.height * scale); ctx.restore();
      });
      messages.forEach((note, i) => {
        const y = notesTop + i * 160;
        ctx.fillStyle = '#f1e5d3'; ctx.fillRect(60, y, 960, 140);
        ctx.fillStyle = '#49362a'; ctx.font = '28px sans-serif'; lines(note.body, 84, y + 40, 910, 36, 2);
        ctx.font = '22px sans-serif'; lines(`— ${note.author}`, 84, y + 120, 910, 26, 1);
      });
      ctx.fillStyle = '#886b55'; ctx.font = '22px sans-serif'; ctx.fillText('memonestia · made together', 60, canvas.height - 50);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('EXPORT')), 'image/png'));
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'memonestia-memory-card.png'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { setError(ko ? '카드를 저장하지 못했어요. 사진 연결을 확인하고 다시 시도해 주세요.' : 'Could not save. Check the photo connection and retry.'); }
    finally { setBusy(false); }
  }
  if (!images.length && !messages.length) return null;
  return <section className="memory-keepsake" aria-label={ko ? '함께 만든 추억 카드' : 'Our memory card'}>
    <span>OUR LITTLE MEMORIES</span><h3>{title}</h3>
    <div className="memory-keepsake-photos">{images.map(photo => <img key={photo.id} src={photo.src} alt={ko ? '추억 카드 사진' : 'Memory card photo'}/>)}</div>
    {messages.map(note => <blockquote key={note.id}><p>{note.body}</p><cite>— {note.author}</cite></blockquote>)}
    <p>{ko ? '최근 공유 사진 최대 4장과 한마디 3개가 카드로 모여요. 저장 이미지에서는 긴 글이 줄여 표시됩니다.' : 'Up to 4 recent shared photos and 3 notes. Long text is shortened in the saved image.'}</p>
    <button type="button" onClick={() => void download()} disabled={busy}>{busy ? (ko ? '카드 만드는 중…' : 'Creating…') : (ko ? '추억 카드 이미지 저장' : 'Save memory card')}</button>
    <small>{ko ? '저장한 이미지에는 사진과 작성자 이름이 포함돼요. 외부에 공유하기 전 친구들의 동의를 확인해 주세요.' : 'The saved image includes photos and author names. Check with your friends before sharing outside the album.'}</small>
    {error && <p role="alert">{error}</p>}
  </section>;
}
