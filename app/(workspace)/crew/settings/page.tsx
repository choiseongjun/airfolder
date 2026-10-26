import {redirect} from 'next/navigation';
import CrewRoutePage from '@/app/crew-route';
import {requestLocale} from '@/lib/request-locale';
import {Suspense} from 'react';
export default function Page({searchParams}:{searchParams:Promise<{lang?:string;legacy?:string;album?:string;group?:string}>}){return <Suspense><Localized searchParams={searchParams}/></Suspense>;}
async function Localized({searchParams}:{searchParams:Promise<{lang?:string;legacy?:string;album?:string;group?:string}>}){const params=await searchParams;const locale=await requestLocale(params.lang);if(params.legacy!=='1'){const q=new URLSearchParams({lang:locale});if(params.album)q.set('album',params.album);if(params.group)q.set('group',params.group);redirect(`/account?${q}`);}return <CrewRoutePage screen="settings" locale={locale}/>;}
