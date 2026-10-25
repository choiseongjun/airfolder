import { Suspense } from 'react';
import { requestLocale } from '@/lib/request-locale';
import { hash, pool } from '@/lib/server';
import GuestFlow from './guest-flow';
import {TripStoryGuest} from '@/app/trip-story';
import { inviteRequest } from '@/lib/invite-request';
import '../../../growth/growth.css';
type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string; next?: string; album?: string; request?: string }> };
export async function generateMetadata({ params, searchParams }: Props) {
 const { token } = await params, query = await searchParams;
 let name: string | null = null, birthday = false;
 if (/^[a-f\d]{64}$/.test(token)) {
  try {
   const result = await pool().query(
    `SELECT f.name,f.category FROM snaproom.invites i JOIN snaproom.folders f ON f.id=i.folder_id AND f.deleted_at IS NULL WHERE i.token_hash=$1 AND i.expires_at>now() AND f.group_id IS NULL
     UNION ALL SELECT g.name,NULL FROM snaproom.group_invites i JOIN snaproom.groups g ON g.id=i.group_id WHERE i.token_hash=$1 AND i.expires_at>now()`,
    [hash(token)],
   );
   name = result.rows[0]?.name ?? null; birthday = result.rows[0]?.category === '생일';
  } catch { /* Metadata degrades gracefully to a generic invite card. */ }
 }
 const locale=await requestLocale(query.lang);
 const noteRequest = query.request === 'birthday' || (!query.request && birthday);
 const koreanTitle = `${query.request==='story'?'너는 그 여행을 어떻게 기억해?':noteRequest ? '축하 한마디 남겨줘!' : '내가 나온 사진, 여기로 보내줘!'} · ${name || 'Memonestia'}`;
 const koreanDescription = query.request==='story'?'네가 찍은 우리 사진 한 장과 가장 웃겼던 순간을 보태줘. 각자의 캐릭터가 소개하는 우리 여행편.':noteRequest ? '사진 없이 한 줄이면 충분해요. 로그인 없이 함께 쓰는 생일 롤링페이퍼.' : '친구 폰에 있는 우리 사진을 한곳에. 로그인 없이 사진을 골라 보내주세요.';
 const title=locale==='ko'?koreanTitle:`${query.request==='story'?'How do you remember our trip?':noteRequest?'Leave a note for our album':'Share your photos with us'} · ${name||'Memonestia'}`;
 const description=locale==='ko'?koreanDescription:'No account or app needed. Add your name and a memory, or write on the back of a shared photo.';
 // The layout's default og:url (the site homepage) would otherwise win here, so KakaoTalk's
 // shared card would open to the homepage instead of this invite when a guest taps it.
 const search = new URLSearchParams();
 for (const key of ['lang', 'album', 'request', 'next'] as const) if (query[key]) search.set(key, query[key]);
 const url = `/join/${token}${search.size ? `?${search}` : ''}`;
 return { title, description, referrer: 'no-referrer' as const, robots: { index: false, follow: false }, openGraph: { title, description, siteName: 'Memonestia', url }, twitter: { card: 'summary_large_image' as const, title, description } };
}
export default function Page(props: Props) { return <Suspense fallback={<main className="growth-page" aria-busy="true">Memonestia</main>}><Content {...props} /></Suspense>; }
async function Content({ params, searchParams }: Props) {
  const query = await searchParams;
  if(query.request==='story')return <TripStoryGuest token={(await params).token} folderId={query.album}/>;
  return <GuestFlow token={(await params).token} locale={await requestLocale(query.lang)} preferredAlbum={query.album} request={query.request ? inviteRequest(query.request) : undefined} nextView={query.next === 'rolling' || query.request === 'birthday' ? 'rolling' : undefined} />;
}
