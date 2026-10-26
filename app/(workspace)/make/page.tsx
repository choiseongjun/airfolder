import { Suspense } from 'react';
import {requestLocale} from '@/lib/request-locale';
import MemoryMaker from './memory-maker';
import { makerTemplate } from '@/lib/album-campaigns';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const ko=(await requestLocale(q.lang))==='ko';
  if(q.themes !== '1' && q.mode !== 'decorate') {
    const title=ko?'당신의 사진과 이야기를 작은 추억책으로 | 메모네스티아':'Your photos and stories, made into a little book | Memonestia';
    const description=ko?'사진 1~8장과 한마디를 표지·사진 페이지·마지막 편지로 만들어드려요. 로그인 없이 미리보고 JPG 이미지 묶음으로 간직하세요.':'Turn one to eight photos and a few words into a cover, photo pages and a closing letter. Preview without signing in and download your JPG image bundle.';
    return { title, description, openGraph: { title, description }, twitter: { card: 'summary_large_image' as const, title, description } };
  }
  const template = q.themes === '1' ? null : makerTemplate(typeof q.template === 'string' ? q.template : null, typeof q.occasion === 'string' ? q.occasion : null);
  const title = `${template?.title || '내 사진으로 만드는 앨범'} | 메모네스티아`;
  const description = '사진 한 장부터 내 앨범으로 바꿔보세요. 로그인 없이 미리보고, 마음에 들면 저장하세요. 저장 전에는 사진을 서버에 올리지 않아요.';
  return { title, description, openGraph: { title, description }, twitter: { card: 'summary_large_image' as const, title, description } };
}
type Props={searchParams:Promise<{lang?:string}>};
async function RequestMaker({searchParams}:Props) { return <MemoryMaker locale={await requestLocale((await searchParams).lang)}/>; }
export default function MakePage(props:Props) { return <Suspense fallback={<p>Memonestia…</p>}><RequestMaker {...props}/></Suspense>; }
