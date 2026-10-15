import { Suspense } from 'react';
import StartFlow from './start-flow';
import { requestLocale } from '@/lib/request-locale';
import '../../growth/growth.css';
export const metadata = { title: '모임 앨범 만들기 | Memonestia' };
export default function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <Suspense fallback={<main className="growth-page" aria-busy="true">Memonestia</main>}><Content searchParams={searchParams} /></Suspense>;
}
async function Content({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <StartFlow locale={await requestLocale((await searchParams).lang)} />;
}
