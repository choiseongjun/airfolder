'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Notifications} from './group-memories';
import WebPushSettings from './web-push-settings';
import {joinedAlbumHref} from '@/lib/album-navigation';
import {trackClient} from '@/lib/growth-client';
import type {Locale} from './i18n';
export default function MemoryUpdates({locale,groupId}:{locale:Locale;groupId:string|null}){
 const ko=locale==='ko',router=useRouter(),[open,setOpen]=useState(false),[interested,setInterested]=useState(false);
 useEffect(()=>{
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore an explicit deep link after hydration.
  if(new URLSearchParams(location.search).get('updates')==='1')setOpen(true);
 },[]);
 return <><WebPushSettings ko={ko}/><details open={open} onToggle={e=>setOpen(e.currentTarget.open)} className="my-3 rounded-xl border border-[#efdfd5] bg-white p-4 text-xs"><summary className="cursor-pointer font-semibold">{ko?'새 메모와 소식':'New notes & updates'}</summary>{open&&<div className="mt-3"><Notifications locale={locale} onOpen={id=>router.push(joinedAlbumHref(locale,id,groupId??undefined))}/></div>}</details><details className="my-3 rounded-xl border border-[#efdfd5] bg-white p-4 text-xs"><summary className="cursor-pointer font-semibold">{ko?'다음에 만나고 싶은 추억 굿즈':'What would you like next?'}</summary><p className="my-2 leading-5">{ko?'사진 인화·포토북은 준비 중이에요. 아직 주문이나 결제는 받지 않습니다. 관심을 알려주시면 준비할 상품을 정하는 데 도움이 돼요.':'Prints and photo books are being explored. Orders and payments are not available yet. Your interest helps us decide what to build.'}</p><button disabled={interested} onClick={()=>{setInterested(true);void trackClient('premium_interest',{feature:'prints'});}} className="rounded-lg border border-[#eadccf] px-3 py-2">{interested?(ko?'의견 고마워요':'Thanks for your feedback'):(ko?'인화·포토북에 관심 있어요':'I’m interested in prints & photo books')}</button></details></>;
}
