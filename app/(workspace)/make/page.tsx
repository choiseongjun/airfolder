import { Suspense } from 'react';
import { connection } from 'next/server';
import MemoryMaker from './memory-maker';
import { makerTemplate, isPhotoRequestEntry } from '@/lib/album-campaigns';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  if (isPhotoRequestEntry(typeof q.template === 'string' ? q.template : null, typeof q.occasion === 'string' ? q.occasion : null, q.themes === '1', typeof q.mode === 'string' ? q.mode : null)) {
    const title = '각자가 기억하는 같은 여행 | 메모네스티아';
    const description = '사진 3장과 내 한마디로 시작하는 우리 여행편. 친구의 사진과 가장 웃겼던 순간까지 모아 캐릭터가 소개하는 카드로 남겨요.';
    return { title, description, openGraph: { title, description }, twitter: { card: 'summary_large_image' as const, title, description } };
  }
  const template = q.themes === '1' ? null : makerTemplate(typeof q.template === 'string' ? q.template : null, typeof q.occasion === 'string' ? q.occasion : null);
  const title = `${template?.title || '내 사진으로 만드는 앨범'} | 메모네스티아`;
  const description = '사진 한 장부터 내 앨범으로 바꿔보세요. 로그인 없이 미리보고, 마음에 들면 저장하세요. 저장 전에는 사진을 서버에 올리지 않아요.';
  return { title, description, openGraph: { title, description }, twitter: { card: 'summary_large_image' as const, title, description } };
}
async function RequestMaker() { await connection(); return <MemoryMaker/>; }
export default function MakePage() { return <Suspense fallback={<p>앨범을 준비하고 있어요…</p>}><RequestMaker/></Suspense>; }
