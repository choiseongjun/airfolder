'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, Ticket, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import './story-ticket.css';

export default function StoryTicket({ folderId, title, ko, onClose }: { folderId: string; title: string; ko: boolean; onClose: () => void }) {
 const canvas = useRef<HTMLCanvasElement>(null);
 const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
 const [error, setError] = useState('');
 function draw(imgs: HTMLImageElement[], names: string[]) {
  const c = canvas.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return;
  const w = 720, h = 1280; c.width = w; c.height = h;
  ctx.fillStyle = '#f3ead9'; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.strokeStyle = '#b89468'; ctx.globalAlpha = .6; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.strokeRect(24, 24, w - 48, h - 48); ctx.restore();
  ctx.fillStyle = '#8a5a33'; ctx.textAlign = 'center'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('MEMONESTIA · OUR LITTLE HISTORY', w / 2, 90);
  const gridTop = 130, pad = 48, gridSize = w - pad * 2, cell = (gridSize - 20) / 2;
  for (let i = 0; i < 4; i++) {
   const x = pad + (i % 2) * (cell + 20), y = gridTop + Math.floor(i / 2) * (cell + 20);
   ctx.save(); ctx.shadowColor = '#0003'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; ctx.fillStyle = '#fffdf8'; ctx.fillRect(x, y, cell, cell); ctx.restore();
   const img = imgs[i], inset = 10;
   if (img) { const pw = cell - inset * 2, ph = cell - inset * 2, scale = Math.max(pw / img.width, ph / img.height), sw = pw / scale, sh = ph / scale; ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x + inset, y + inset, pw, ph); }
  }
  const afterGrid = gridTop + cell * 2 + 20 + 50;
  ctx.fillStyle = '#3c2b1d'; ctx.font = "bold 36px Georgia, 'Times New Roman', serif"; ctx.fillText(title, w / 2, afterGrid, w - 100);
  if (names.length) { ctx.fillStyle = '#8a5a33'; ctx.font = '16px sans-serif'; ctx.fillText(names.slice(0, 6).join(' · '), w / 2, afterGrid + 36, w - 100); }
  const cutY = h - 220;
  ctx.save(); ctx.strokeStyle = '#b89468'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(24, cutY); ctx.lineTo(w - 24, cutY); ctx.stroke(); ctx.restore();
  const barY = cutY + 40, barH = 60; let bx = 60;
  ctx.fillStyle = '#3c2b1d';
  while (bx < w - 60) { const bw = 1 + Math.random() * 4; ctx.fillRect(bx, barY, bw, barH); bx += bw + 2 + Math.random() * 6; }
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', ' . ');
  ctx.font = '14px monospace'; ctx.fillText(`${date}  ·  NO. ${Math.floor(Math.random() * 90000 + 10000)}`, w / 2, barY + barH + 30);
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#a9875f'; ctx.fillText('memonestia.xyz', w / 2, h - 40);
 }
 useEffect(() => {
  let active = true;
  (async () => {
   try {
    const [photosRes, membersRes] = await Promise.all([
     api<{ photos: { id: string; name: string; src: string }[] }>(`/api/photos/best?folderId=${encodeURIComponent(folderId)}`),
     api<{ members: { id: string; name: string }[] }>(`/api/members?folderId=${encodeURIComponent(folderId)}`),
    ]);
    if (!active) return;
    if (!photosRes.photos.length) { setError(ko ? '티켓에 쓸 사진이 없어요.' : 'No photos to use yet.'); setStatus('error'); return; }
    const imgs = await Promise.all(photosRes.photos.slice(0, 4).map(p => new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = p.src; })));
    if (!active) return;
    draw(imgs, membersRes.members.map(m => m.name));
    setStatus('ready');
   } catch { if (active) { setError(ko ? '티켓을 만들지 못했어요. 다시 시도해 주세요.' : 'Could not create the ticket. Please retry.'); setStatus('error'); } }
  })();
  return () => { active = false; };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [folderId]);
 async function download() { const c = canvas.current; if (!c) return; const url = c.toDataURL('image/jpeg', .92); const a = document.createElement('a'); a.href = url; a.download = 'memonestia-story.jpg'; a.click(); }
 return <div className="story-ticket-backdrop" role="dialog" aria-modal="true" aria-label={ko ? '인스타 스토리 티켓' : 'Instagram story ticket'} onClick={onClose}>
  <section className="story-ticket" onClick={e => e.stopPropagation()}>
   <button className="story-ticket-close" onClick={onClose} aria-label={ko ? '닫기' : 'Close'}><X size={18}/></button>
   <h2><Ticket size={18}/>{ko ? '인스타 스토리용 티켓' : 'Instagram story ticket'}</h2>
   {status === 'loading' && <p role="status">{ko ? '티켓을 만드는 중…' : 'Making your ticket…'}</p>}
   {status === 'error' && <p role="alert">{error}</p>}
   <canvas ref={canvas} className={status === 'ready' ? 'is-ready' : ''} aria-label={ko ? '티켓 미리보기' : 'Ticket preview'}/>
   {status === 'ready' && <button className="primary-button full" onClick={download}><Download size={16}/>{ko ? '이미지 저장하기' : 'Save image'}</button>}
  </section>
 </div>;
}
