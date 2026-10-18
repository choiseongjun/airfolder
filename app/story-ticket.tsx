'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Download, GalleryVertical, Shuffle, Ticket, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import './story-ticket.css';

type TicketPhoto = { id: string; name: string; src: string };
type Format = 'collage' | 'strip';
function pickRandom(photos: TicketPhoto[], n: number) {
 const pool = [...photos], picked: TicketPhoto[] = [];
 while (picked.length < n && pool.length) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
 return picked;
}
function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; }); }

export default function StoryTicket({ folderId, title, photos, ko, onClose }: { folderId: string; title: string; photos: TicketPhoto[]; ko: boolean; onClose: () => void }) {
 const canvas = useRef<HTMLCanvasElement>(null);
 const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
 const [error, setError] = useState('');
 const [names, setNames] = useState<string[]>([]);
 const [imgs, setImgs] = useState<HTMLImageElement[]>([]);
 const [format, setFormat] = useState<Format>('collage');
 const [tagMessage, setTagMessage] = useState('');

 const drawCollage = useCallback((loaded: HTMLImageElement[], memberNames: string[]) => {
  const c = canvas.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
  const w = 720, h = 1280; c.width = w; c.height = h;
  ctx.fillStyle = '#f3ead9'; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.strokeStyle = '#b89468'; ctx.globalAlpha = .6; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.strokeRect(24, 24, w - 48, h - 48); ctx.restore();
  ctx.fillStyle = '#8a5a33'; ctx.textAlign = 'center'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('MEMONESTIA · OUR LITTLE HISTORY', w / 2, 90);
  const gridTop = 130, pad = 48, gridSize = w - pad * 2, cell = (gridSize - 20) / 2;
  for (let i = 0; i < 4; i++) {
   const x = pad + (i % 2) * (cell + 20), y = gridTop + Math.floor(i / 2) * (cell + 20);
   ctx.save(); ctx.shadowColor = '#0003'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; ctx.fillStyle = '#fffdf8'; ctx.fillRect(x, y, cell, cell); ctx.restore();
   const img = loaded[i], inset = 10;
   if (img) { const pw = cell - inset * 2, ph = cell - inset * 2, scale = Math.max(pw / img.width, ph / img.height), sw = pw / scale, sh = ph / scale; ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x + inset, y + inset, pw, ph); }
  }
  const afterGrid = gridTop + cell * 2 + 20 + 50;
  ctx.fillStyle = '#3c2b1d'; ctx.font = "bold 36px Georgia, 'Times New Roman', serif"; ctx.fillText(title, w / 2, afterGrid, w - 100);
  if (memberNames.length) { ctx.fillStyle = '#8a5a33'; ctx.font = '16px sans-serif'; ctx.fillText(memberNames.slice(0, 6).join(' · '), w / 2, afterGrid + 36, w - 100); }
  const cutY = h - 220;
  ctx.save(); ctx.strokeStyle = '#b89468'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(24, cutY); ctx.lineTo(w - 24, cutY); ctx.stroke(); ctx.restore();
  const barY = cutY + 40, barH = 60; let bx = 60;
  ctx.fillStyle = '#3c2b1d';
  while (bx < w - 60) { const bw = 1 + Math.random() * 4; ctx.fillRect(bx, barY, bw, barH); bx += bw + 2 + Math.random() * 6; }
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', ' . ');
  ctx.font = '14px monospace'; ctx.fillText(`${date}  ·  NO. ${Math.floor(Math.random() * 90000 + 10000)}`, w / 2, barY + barH + 30);
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#a9875f'; ctx.fillText('memonestia.xyz', w / 2, h - 40);
 }, [title]);

 const drawStrip = useCallback((loaded: HTMLImageElement[], memberNames: string[]) => {
  const c = canvas.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
  const w = 360, pad = 20, cellW = w - pad * 2, cellH = 232, gap = 12, headerH = 64, footerH = 140;
  const h = pad * 2 + headerH + cellH * 4 + gap * 3 + footerH; c.width = w; c.height = h;
  ctx.fillStyle = '#2a2622'; ctx.fillRect(0, 0, w, h);
  for (let side = 0; side < 2; side++) { const x = side === 0 ? 11 : w - 11; for (let hpos = 40; hpos < h - 20; hpos += 34) { ctx.fillStyle = '#131110'; ctx.beginPath(); ctx.arc(x, hpos, 5, 0, Math.PI * 2); ctx.fill(); } }
  ctx.fillStyle = '#e7d9bd'; ctx.textAlign = 'center'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('memonestia.', w / 2, pad + 30);
  ctx.font = '10px sans-serif'; ctx.fillStyle = '#b39f7c'; ctx.fillText('FILM STRIP · OUR LITTLE HISTORY', w / 2, pad + 48);
  for (let i = 0; i < 4; i++) {
   const x = pad, y = pad + headerH + i * (cellH + gap);
   ctx.fillStyle = '#17150f'; ctx.fillRect(x, y, cellW, cellH);
   const img = loaded[i], inset = 7;
   if (img) { const pw = cellW - inset * 2, ph = cellH - inset * 2, scale = Math.max(pw / img.width, ph / img.height), sw = pw / scale, sh = ph / scale; ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x + inset, y + inset, pw, ph); }
   else { ctx.fillStyle = '#3a342b'; ctx.fillRect(x + inset, y + inset, cellW - inset * 2, cellH - inset * 2); }
  }
  const footerTop = pad + headerH + cellH * 4 + gap * 3 + 26;
  ctx.fillStyle = '#e7d9bd'; ctx.font = "bold 20px Georgia, 'Times New Roman', serif"; ctx.fillText(title, w / 2, footerTop, w - 40);
  if (memberNames.length) { ctx.font = '12px sans-serif'; ctx.fillStyle = '#b39f7c'; ctx.fillText(memberNames.slice(0, 4).join(' · '), w / 2, footerTop + 26, w - 40); }
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', ' . ');
  ctx.font = '11px monospace'; ctx.fillStyle = '#8c7a5c'; ctx.fillText(date, w / 2, h - pad - 14);
 }, [title]);

 const roll = useCallback(() => {
  if (!photos.length) { setError(ko ? '티켓에 쓸 사진이 없어요.' : 'No photos to use yet.'); setStatus('error'); return; }
  setStatus('loading'); setError('');
  const picks = pickRandom(photos, Math.min(4, photos.length));
  Promise.all(picks.map(p => loadImage(p.src)))
   .then(loaded => { setImgs(loaded); setStatus('ready'); })
   .catch(() => { setError(ko ? '티켓을 만들지 못했어요. 다시 시도해 주세요.' : 'Could not create the ticket. Please retry.'); setStatus('error'); });
 }, [photos, ko]);
 useEffect(() => {
  let active = true;
  api<{ members: { id: string; name: string }[] }>(`/api/members?folderId=${encodeURIComponent(folderId)}`)
   .then(res => { if (active) setNames(res.members.map(m => m.name)); })
   .catch(() => {})
   .finally(() => { if (active) roll(); });
  return () => { active = false; };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [folderId]);
 useEffect(() => {
  if (status !== 'ready' || !imgs.length) return;
  if (format === 'strip') drawStrip(imgs, names); else drawCollage(imgs, names);
 }, [imgs, names, format, status, drawStrip, drawCollage]);

 async function download() { const c = canvas.current; if (!c) return; const url = c.toDataURL('image/jpeg', .92); const a = document.createElement('a'); a.href = url; a.download = `memonestia-${format}.jpg`; a.click(); }
 const tagBase = ko ? ['#인생네컷', '#필름앨범', '#포토스트립', '#추억앨범'] : ['#filmstrip', '#photobooth', '#memoryalbum', '#ourstory'];
 const titleTag = title.trim().replace(/\s+/g, '').slice(0, 20);
 const tags = [...tagBase, ...(titleTag ? [`#${titleTag}`] : []), '#memonestia'];
 async function copyTags() { try { await navigator.clipboard.writeText(tags.join(' ')); setTagMessage(ko ? '해시태그를 복사했어요.' : 'Hashtags copied.'); } catch { setTagMessage(ko ? '복사하지 못했어요. 직접 선택해 복사해 주세요.' : 'Could not copy. Select the text manually.'); } }

 return <div className="story-ticket-backdrop" role="dialog" aria-modal="true" aria-label={ko ? '인스타용 카드' : 'Instagram-ready card'} onClick={onClose}>
  <section className="story-ticket" onClick={e => e.stopPropagation()}>
   <button className="story-ticket-close" onClick={onClose} aria-label={ko ? '닫기' : 'Close'}><X size={18}/></button>
   <h2><Ticket size={18}/>{ko ? '인스타용 카드' : 'Instagram-ready card'}</h2>
   <div className="story-ticket-format" role="group" aria-label={ko ? '카드 형식' : 'Card format'}>
    <button aria-pressed={format === 'collage'} onClick={() => setFormat('collage')}><Ticket size={14}/>{ko ? '콜라주 티켓' : 'Collage ticket'}</button>
    <button aria-pressed={format === 'strip'} onClick={() => setFormat('strip')}><GalleryVertical size={14}/>{ko ? '필름 스트립' : 'Film strip'}</button>
   </div>
   {status === 'loading' && <p role="status">{ko ? '카드를 만드는 중…' : 'Making your card…'}</p>}
   {status === 'error' && <p role="alert">{error}</p>}
   <canvas ref={canvas} className={`${status === 'ready' ? 'is-ready' : ''} format-${format}`} aria-label={ko ? '카드 미리보기' : 'Card preview'}/>
   {status === 'ready' && <div className="story-ticket-actions">
    <button className="secondary-button" disabled={photos.length <= 4} onClick={roll}><Shuffle size={16}/>{ko ? '다른 조합 뽑기' : 'Draw again'}</button>
    <button className="primary-button" onClick={download}><Download size={16}/>{ko ? '이미지 저장하기' : 'Save image'}</button>
   </div>}
   {status === 'ready' && <div className="story-ticket-tags">
    <p>{ko ? '같이 올리면 좋은 해시태그' : 'Hashtags worth posting with it'}</p>
    <div className="story-ticket-tag-list">{tags.map(tag => <span key={tag}>{tag}</span>)}</div>
    <button className="text-button" onClick={copyTags}><Copy size={14}/>{ko ? '해시태그 복사' : 'Copy hashtags'}</button>
    {tagMessage && <small role="status">{tagMessage}</small>}
    <small className="story-ticket-timing">{ko ? '주말이나 연휴에 올리면 반응이 더 좋아요.' : '✨ Posts tend to land best on weekends or holidays.'}</small>
   </div>}
  </section>
 </div>;
}
