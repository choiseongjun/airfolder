import { Suspense } from 'react';
import MemoryMaker from './memory-maker';
import { makerTemplate } from '@/lib/album-campaigns';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const template = q.themes === '1' ? null : makerTemplate(typeof q.template === 'string' ? q.template : null, typeof q.occasion === 'string' ? q.occasion : null);
  const title = `${template?.title || '내 사진으로 만드는 앨범'} | 메모네스티아`;
  const description = '사진 한 장부터 내 앨범으로 바꿔보세요. 로그인 없이 미리보고, 마음에 들면 저장하세요. 저장 전에는 사진을 서버에 올리지 않아요.';
  return { title, description, openGraph: { title, description }, twitter: { card: 'summary_large_image' as const, title, description } };
}
export default function MakePage() { return <Suspense fallback={<p>앨범을 준비하고 있어요…</p>}><MemoryMaker/></Suspense>; }
