import { Suspense } from 'react';
import { requestLocale } from '@/lib/request-locale';
import GuestFlow from './guest-flow';
import '../../../growth/growth.css';
export const metadata = { title: '모임에 사진 보태기 | Memolumi', referrer: 'no-referrer', robots: { index: false, follow: false } };
type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> };
export default function Page(props: Props) { return <Suspense fallback={<main className="growth-page" aria-busy="true">Memolumi</main>}><Content {...props} /></Suspense>; }
async function Content({ params, searchParams }: Props) {
  return <GuestFlow token={(await params).token} locale={await requestLocale((await searchParams).lang)} />;
}
