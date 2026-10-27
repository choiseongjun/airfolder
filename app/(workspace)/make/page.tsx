import { Suspense } from 'react';
import {requestLocale} from '@/lib/request-locale';
import MemoryMaker from './memory-maker';
import { makerTemplate } from '@/lib/album-campaigns';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const ko=(await requestLocale(q.lang))==='ko';
  if(q.themes !== '1' && q.mode !== 'decorate') {
    const title=ko?'함께한 날들을 우리의 책장에 | 메모네스티아':'Our days, kept on a shared shelf | Memonestia';
    const description=ko?'사진과 한마디로 추억책을 만들고, 초대한 사람과 같은 책장에 보관하세요. 여행도 평범한 주말도 한 권씩 쌓아 다시 펼쳐봐요.':'Make a memory book with your photos and words. Keep it on a shared shelf and invite someone to add their story.';
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
