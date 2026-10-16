'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
export default function WallPin({ ids, ko }: { ids: string[]; ko: boolean }) {
 const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [done, setDone] = useState(false), [rare, setRare] = useState(false);
 async function pin() { setBusy(true); setMessage(''); try {
  const result = await api<{ pinned: number; rare: boolean }>('/api/wall', { method: 'POST', body: JSON.stringify({ ids }) });
  setDone(true); setRare(result.rare);
  setMessage(result.pinned ? (ko ? '공용 벽에 붙였어요!' : 'Pinned to the wall!') : (ko ? '이미 붙어 있어요.' : 'Already on the wall.'));
 } catch { setMessage(ko ? '공개 사진만 벽에 붙일 수 있어요.' : 'Only fully public photos can be pinned.'); } finally { setBusy(false); } }
 if (!ids.length) return null;
 return <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e6e2d9' }}>
  <h3>{ko ? '공용 벽에 붙이기' : 'Pin to the public wall'}</h3>
  <p>{ko ? '누구나 볼 수 있는 모두의 추억 벽에 이 사진을 꽂아둬요. 같은 앨범 멤버가 아니어도 볼 수 있어요.' : 'Pin this photo to a wall anyone can browse — even people outside your album.'}</p>
  {!done
   ? <button className="secondary-button full" disabled={busy} onClick={pin}>{busy ? (ko ? '붙이는 중…' : 'Pinning…') : (ko ? `${ids.length}개 벽에 붙이기` : `Pin ${ids.length} to the wall`)}</button>
   : <p role="status">{rare && '✨ '}{message} <Link href="/wall" target="_blank">{ko ? '벽 구경하기 ↗' : 'See the wall ↗'}</Link></p>}
  {!done && message && <p role="alert">{message}</p>}
 </div>;
}
