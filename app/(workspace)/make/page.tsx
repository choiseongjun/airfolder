import { Suspense } from 'react';
import { connection } from 'next/server';
import MemoryMaker from './memory-maker';
import { makerTemplate, isPhotoRequestEntry } from '@/lib/album-campaigns';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  if (isPhotoRequestEntry(typeof q.template === 'string' ? q.template : null, typeof q.occasion === 'string' ? q.occasion : null, q.themes === '1', typeof q.mode === 'string' ? q.mode : null)) {
    const title = '친구 폰 속 내 사진, 링크 하나로 모아요 | 메모네스티아';
    const description = '여행 사진 받을 링크를 만들고 단톡방에 보내세요. 내 사진 없이 시작하고, 친구도 앱 설치·회원가입 없이 사진을 보탤 수 있어요.';
    return { title, description, openGraph: { title, description }, twitter: { card: 'summary_large_image' as const, title, description } };
  }
  const template = q.themes === '1' ? null : makerTemplate(typeof q.template === 'string' ? q.template : null, typeof q.occasion === 'string' ? q.occasion : null);
  const title = `${template?.title || '내 사진으로 만드는 앨범'} | 메모네스티아`;
  const description = '사진 한 장부터 내 앨범으로 바꿔보세요. 로그인 없이 미리보고, 마음에 들면 저장하세요. 저장 전에는 사진을 서버에 올리지 않아요.';
  return { title, description, openGraph: { title, description }, twitter: { card: 'summary_large_image' as const, title, description } };
}
async function RequestMaker() { await connection(); return <MemoryMaker/>; }
export default function MakePage() { return <Suspense fallback={<p>앨범을 준비하고 있어요…</p>}><RequestMaker/></Suspense>; }
