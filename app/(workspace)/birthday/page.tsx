import { Suspense } from 'react';
import BirthdayFlow from './birthday-flow';
import { requestLocale } from '@/lib/request-locale';
import '../../growth/growth.css';
export const metadata = { title: '생일 앨범 만들기 | Memonestia', description: '친구들이 사진 한 장, 한마디씩 채우면 생일 앨범이 예쁘게 완성돼요.' };
export default function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <Suspense fallback={<main className="growth-page" aria-busy="true">Memonestia</main>}><Content searchParams={searchParams} /></Suspense>;
}
async function Content({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  return <BirthdayFlow locale={await requestLocale((await searchParams).lang)} />;
}
