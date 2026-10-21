import { Suspense } from 'react';
import MemoryMaker from './memory-maker';
export const metadata = { title: '내 사진으로 추억 카드 만들기 | 메모네스티아', description: '친구와 하루, 생일 축하, 여행 네컷. 사진 네 장으로 간직하고 싶은 카드를 만들어보세요.' };
export default function MakePage() { return <Suspense fallback={<p>카드를 준비하고 있어요…</p>}><MemoryMaker/></Suspense>; }
