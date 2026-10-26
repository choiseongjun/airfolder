import {Suspense} from 'react';
import KeepsakeWorkspace from '@/app/keepsake-workspace';
import {requestLocale} from '@/lib/request-locale';
export default function Page({searchParams}:{searchParams:Promise<{lang?:string}>}){return <Suspense><Content searchParams={searchParams}/></Suspense>;}
async function Content({searchParams}:{searchParams:Promise<{lang?:string}>}){const {lang}=await searchParams;return <KeepsakeWorkspace screen="gifts" locale={await requestLocale(lang)}/>;}
