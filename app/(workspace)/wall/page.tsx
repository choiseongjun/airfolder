/* eslint-disable @next/next/no-img-element */
import { connection } from 'next/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { wallPins } from '@/lib/wall';
import { requestLocale } from '@/lib/request-locale';
import './wall.css';
export const metadata = { title: 'Memonestia · 공용 벽', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
type Props = { searchParams: Promise<{ lang?: string }> };
export default function WallPage(props: Props) { return <Suspense fallback={<main aria-busy="true">Memonestia · Loading…</main>}><WallContent {...props}/></Suspense>; }
async function WallContent({ searchParams }: Props) {
 await connection();
 const locale = await requestLocale((await searchParams).lang), ko = locale === 'ko';
 const pins = await wallPins();
 return <main lang={locale} className="wall-page">
  <header className="wall-header"><Link href="/" className="wall-brand">memonestia.</Link>
   <h1>{ko ? '우리 모두의 벽' : 'Everyone’s wall'}</h1>
   <p>{ko ? '여기 붙은 네컷은 각자의 앨범에서 직접 골라 꽂아둔 순간들이에요.' : 'Each card here was pinned by its own owner from their album.'}</p>
  </header>
  {!pins.length
   ? <p className="wall-empty">{ko ? '아직 벽이 비어 있어요. 첫 번째로 붙여보세요!' : 'The wall is empty — be the first to pin a memory!'}</p>
   : <div className="wall-board" role="list">{pins.map(p => <figure role="listitem" key={p.id} className={`wall-card ${p.rare ? 'wall-card-rare' : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `rotate(${p.rotation}deg)` }}>
    {p.mime.startsWith('video/') ? <video src={`/api/photos/${p.photo_id}/content?wall=1`} muted loop playsInline preload="metadata"/> : <img src={`/api/photos/${p.photo_id}/content?wall=1`} alt={p.name} loading="lazy"/>}
    {p.rare && <span className="wall-card-badge" aria-hidden="true">✨</span>}
   </figure>)}</div>}
  <p className="wall-footer"><Link href="/support#safety">{ko ? '콘텐츠·사용자 신고' : 'Report content or a user'}</Link> · <Link href="/terms">{ko ? '커뮤니티 규칙' : 'Community rules'}</Link></p>
 </main>;
}
