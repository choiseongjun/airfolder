import {notFound} from 'next/navigation';
import {Suspense} from 'react';
import Link from 'next/link';
import {publicMetadata} from '@/lib/seo';
import {isPublicLocale} from '@/lib/public-locale';
import KeepsakeLanding from '@/app/keepsake-landing';
import RegionalLanding from './regional-landing';
type Props={params:Promise<{lang:string}>};
export async function generateMetadata({params}:Props){const {lang}=await params;if(!isPublicLocale(lang))notFound();return publicMetadata(lang);}
export default async function Landing({params}:Props){const {lang}=await params;if(lang==='en-ph'||lang==='id')return <RegionalLanding locale={lang}/>;if(lang!=='ko'&&lang!=='en')notFound();return <Suspense fallback={<main className="keepsake-shell"><h1>{lang==='ko'?'사진과 이야기를, 작은 추억책으로.':'Your photos and words, made into a little book.'}</h1><p>{lang==='ko'?'사진 1~8장과 한마디로 표지부터 마지막 편지까지.':'From a cover to a final letter, with 1–8 photos and your own words.'}</p><Link href={`/make?lang=${lang}&stage=create`}>{lang==='ko'?'추억책 만들기':'Make a memory book'} →</Link></main>}><KeepsakeLanding locale={lang}/></Suspense>;}
