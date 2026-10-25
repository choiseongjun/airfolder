import CrewRoutePage from '@/app/crew-route';
import {requestLocale} from '@/lib/request-locale';
import {Suspense} from 'react';
export default function Page({searchParams}:{searchParams:Promise<{lang?:string}>}){return <Suspense><Localized searchParams={searchParams}/></Suspense>;}
async function Localized({searchParams}:{searchParams:Promise<{lang?:string}>}){const {lang}=await searchParams;return <CrewRoutePage screen="behind" locale={await requestLocale(lang)}/>;}
