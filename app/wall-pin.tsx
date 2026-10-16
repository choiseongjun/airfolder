'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { api } from '@/lib/client-api';
import './wall-pin.css';
export default function WallPin({ ids, ko }: { ids: string[]; ko: boolean }) {
 const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [done, setDone] = useState(false), [rare, setRare] = useState(false);
 async function pin() { setBusy(true); setMessage(''); try {
  const result = await api<{ pinned: number; rare: boolean }>('/api/wall', { method: 'POST', body: JSON.stringify({ ids }) });
  setDone(true); setRare(result.rare);
  setMessage(result.pinned ? (ko ? '벽에 붙였어요!' : 'Pinned!') : (ko ? '이미 붙어 있어요.' : 'Already on the wall.'));
 } catch { setMessage(ko ? '공개 사진만 벽에 붙일 수 있어요.' : 'Only fully public photos can be pinned.'); } finally { setBusy(false); } }
 if (!ids.length) return null;
 return <div className="wall-pin-card">
  <div className="wall-pin-head"><span className="wall-pin-icon" aria-hidden="true"><Sparkles size={15}/></span><div><strong>{ko ? '공용 벽에도 붙여볼까요?' : 'Pin it to the public wall?'}</strong><small>{ko ? '누구나 구경할 수 있는 모두의 추억 벽이에요' : 'A wall anyone can browse'}</small></div></div>
  <p>{ko ? '이 사진을 모두의 벽에 꽂아두면, 같은 앨범 멤버가 아닌 사람도 볼 수 있어요.' : 'Pinning puts this photo on a wall visible to anyone — even outside your album.'}</p>
  {!done
   ? <button className="secondary-button full" disabled={busy} onClick={pin}>{busy ? (ko ? '붙이는 중…' : 'Pinning…') : (ko ? `${ids.length}개 벽에 붙이기` : `Pin ${ids.length} to the wall`)}</button>
   : <p className="wall-pin-done" role="status">{rare && <span className="wall-pin-rare">✨ {ko ? '레어 자리!' : 'Rare spot!'}</span>}<span>{message}</span><Link href="/wall" target="_blank">{ko ? '벽 구경하기' : 'See the wall'}<ArrowRight size={13}/></Link></p>}
  {!done && message && <p className="wall-pin-error" role="alert">{message}</p>}
 </div>;
}
