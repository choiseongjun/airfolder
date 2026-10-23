import { Suspense } from 'react';
import MemoryMaker from './memory-maker';
export const metadata = { title: '여행 사진 모아 친구와 앨범 만들기 | 메모네스티아', description: '여행 사진을 최대 30장으로 시작해 앨범으로 만들고 친구에게 보내세요. 친구가 찍은 사진도 같은 앨범에 모을 수 있어요.' };
export default function MakePage() { return <Suspense fallback={<p>앨범을 준비하고 있어요…</p>}><MemoryMaker/></Suspense>; }
