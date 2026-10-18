import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { isPublicLanguage, publicOrigin } from '@/lib/seo';
import { guides } from './guides';
import './guides.css';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props) {
 const { lang } = await params; if (!isPublicLanguage(lang)) notFound();
 const origin = publicOrigin(), ko = lang === 'ko';
 const title = ko ? '사진 앨범 만들기 가이드 — 생일·여행·결혼식·단체사진 | Memonestia' : 'Photo album guides: birthdays, trips, weddings, group photos | Memonestia';
 const description = ko ? '생일 앨범, 여행 사진 공유, 결혼식 하객 사진, 단체사진 모으기, 온라인 네컷까지. 링크 하나로 모으고 자동으로 꾸미는 방법을 소개해요.' : 'Birthday albums, shared trip photos, wedding guest photos, group photos and photo strips: gather with one link and decorate automatically.';
 return { title, description, metadataBase: origin ? new URL(origin) : undefined, robots: { index: Boolean(origin), follow: Boolean(origin) },
  ...(origin ? { alternates: { canonical: `${origin}/${lang}/make`, languages: { ko: `${origin}/ko/make`, en: `${origin}/en/make`, 'x-default': `${origin}/en/make` } } } : {}),
  openGraph: { title, description, siteName: 'Memonestia' } };
}

export default async function Guides({ params }: Props) {
 const { lang } = await params; if (!isPublicLanguage(lang)) notFound();
 const ko = lang === 'ko', i = ko ? 0 : 1, t = (a: string, b: string) => ko ? a : b;
 return <div className="guide-page">
  <header className="guide-nav"><Link className="guide-brand" href={`/${lang}`}>memonestia<span>.</span></Link><nav><Link href={`/${ko ? 'en' : 'ko'}/make`} lang={ko ? 'en' : 'ko'}>{ko ? 'EN' : '한국어'}</Link><Link href={`/?lang=${lang}`}>{t('내 공간', 'My space')}<ArrowUpRight size={15} /></Link></nav></header>
  <main>
   <section className="guide-block guide-index-head"><p className="guide-kicker">{t('만들기 가이드', 'GUIDES')}</p><h1>{t('어떤 앨범을 만들어 볼까요?', 'What would you like to make?')}</h1><p className="guide-lead">{t('링크 하나로 사진을 모으고, 꾸미기는 자동으로. 상황별로 골라 보세요.', 'Gather photos with one link and let the decorating happen on its own. Pick your occasion.')}</p></section>
   <section className="guide-cards">{guides.map(g => <Link key={g.slug} href={`/${lang}/make/${g.slug}`}><span className="guide-card-photo"><Image src={g.image} alt="" fill sizes="(max-width: 760px) 90vw, 320px" /></span><strong>{g.kicker[i]}</strong><span>{g.h1[i]}</span></Link>)}</section>
  </main>
  <footer className="guide-footer"><Link className="guide-brand" href={`/${lang}`}>memonestia.</Link><div><Link href="/privacy">{t('개인정보', 'Privacy')}</Link><Link href="/terms">{t('이용약관', 'Terms')}</Link><Link href="/support">{t('문의', 'Support')}</Link></div></footer>
 </div>;
}
