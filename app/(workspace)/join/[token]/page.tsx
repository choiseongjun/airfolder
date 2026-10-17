import { Suspense } from 'react';
import { requestLocale } from '@/lib/request-locale';
import { hash, pool } from '@/lib/server';
import GuestFlow from './guest-flow';
import '../../../growth/growth.css';
type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> };
export async function generateMetadata({ params }: Props) {
 const { token } = await params;
 let name: string | null = null;
 if (/^[a-f\d]{64}$/.test(token)) {
  try {
   const result = await pool().query(
    `SELECT f.name FROM snaproom.invites i JOIN snaproom.folders f ON f.id=i.folder_id AND f.deleted_at IS NULL WHERE i.token_hash=$1 AND i.expires_at>now() AND f.group_id IS NULL
     UNION ALL SELECT g.name FROM snaproom.group_invites i JOIN snaproom.groups g ON g.id=i.group_id WHERE i.token_hash=$1 AND i.expires_at>now()`,
    [hash(token)],
   );
   name = result.rows[0]?.name ?? null;
  } catch { /* Metadata degrades gracefully to a generic invite card. */ }
 }
 const title = name ? `${name} · Memonestia` : '모임에 사진 보태기 | Memonestia';
 const description = name ? `${name}에 초대받았어요. 로그인 없이 내 사진만 골라 보탤 수 있어요.` : '초대받은 모임에 로그인 없이 사진을 보탤 수 있어요.';
 return { title, description, referrer: 'no-referrer' as const, robots: { index: false, follow: false }, openGraph: { title, description, siteName: 'Memonestia' }, twitter: { card: 'summary_large_image' as const, title, description } };
}
export default function Page(props: Props) { return <Suspense fallback={<main className="growth-page" aria-busy="true">Memonestia</main>}><Content {...props} /></Suspense>; }
async function Content({ params, searchParams }: Props) {
  return <GuestFlow token={(await params).token} locale={await requestLocale((await searchParams).lang)} />;
}
