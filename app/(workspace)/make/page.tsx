import { Suspense } from 'react';
import {requestLocale} from '@/lib/request-locale';
import MemoryMaker from './memory-maker';
import { makerTemplate, isPhotoRequestEntry } from '@/lib/album-campaigns';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const ko=(await requestLocale(q.lang))==='ko';
  if (isPhotoRequestEntry(typeof q.template === 'string' ? q.template : null, typeof q.occasion === 'string' ? q.occasion : null, q.themes === '1', typeof q.mode === 'string' ? q.mode : null)) {
    const title = ko?'각자가 기억하는 같은 여행 | 메모네스티아':'Same trip, different memories | Memonestia';
    const description = ko?'사진 3장과 내 한마디로 시작하는 우리 여행편. 친구의 사진과 가장 웃겼던 순간까지 모아 캐릭터가 소개하는 카드로 남겨요.':'Start our trip story with photos and a few words. Invite friends to add their memories, with a little character beside each story.';
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
