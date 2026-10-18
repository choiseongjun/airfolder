import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import { isPublicLanguage, publicOrigin } from '@/lib/seo';
import { guideBySlug, guides } from '../guides';
import '../guides.css';

type Props = { params: Promise<{ lang: string; slug: string }> };

// Cache Components needs at least one result per parent locale; non-ko/en locales 404 in the page itself.
export function generateStaticParams() { return guides.map(g => ({ slug: g.slug })); }

async function resolve(params: Props['params']) {
 const { lang, slug } = await params, guide = guideBySlug(slug);
 if (!isPublicLanguage(lang) || !guide) notFound();
 return { lang, guide, i: lang === 'ko' ? 0 : 1 };
}

export async function generateMetadata({ params }: Props) {
 const { lang, guide, i } = await resolve(params), origin = publicOrigin();
 const title = guide.title[i], description = guide.description[i];
 return {
  title, description, metadataBase: origin ? new URL(origin) : undefined,
  robots: { index: Boolean(origin), follow: Boolean(origin) },
  ...(origin ? { alternates: { canonical: `${origin}/${lang}/make/${guide.slug}`, languages: { ko: `${origin}/ko/make/${guide.slug}`, en: `${origin}/en/make/${guide.slug}`, 'x-default': `${origin}/en/make/${guide.slug}` } } } : {}),
  openGraph: { type: 'article', title, description, siteName: 'Memonestia', locale: lang === 'ko' ? 'ko_KR' : 'en_US', ...(origin ? { url: `${origin}/${lang}/make/${guide.slug}`, images: [{ url: `${origin}${guide.image}`, width: 1200, height: 900, alt: guide.h1[i] }] } : {}) },
  twitter: { card: 'summary_large_image' as const, title, description, ...(origin ? { images: [`${origin}${guide.image}`] } : {}) },
 };
}

export default async function GuidePage({ params }: Props) {
 const { lang, guide, i } = await resolve(params), ko = lang === 'ko', t = (a: string, b: string) => ko ? a : b;
 const href = `${guide.cta.href}${guide.cta.href.includes('?') ? '&' : '?'}lang=${lang}`;
 // FAQ structured data mirrors the visible questions, so search can show them as rich results.
 const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: guide.faqs.map(([q, a]) => ({ '@type': 'Question', name: q[i], acceptedAnswer: { '@type': 'Answer', text: a[i] } })) };
 return <div className="guide-page">
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }} />
  <header className="guide-nav"><Link className="guide-brand" href={`/${lang}`}>memonestia<span>.</span></Link><nav><Link href={`/${lang}/make`}>{t('만들기 가이드', 'Guides')}</Link><Link href={`/${ko ? 'en' : 'ko'}/make/${guide.slug}`} lang={ko ? 'en' : 'ko'}>{ko ? 'EN' : '한국어'}</Link><Link href={`/?lang=${lang}`}>{t('내 공간', 'My space')}<ArrowUpRight size={15} /></Link></nav></header>
  <main>
   <section className="guide-hero">
    <div><p className="guide-kicker">{guide.kicker[i]}</p><h1>{guide.h1[i]}</h1><p className="guide-lead">{guide.lead[i]}</p>
     <Link className="guide-cta" href={href}>{ko ? guide.cta.ko : guide.cta.en}<ArrowRight size={18} /></Link>
     <p className="guide-hint">{t('무료 · 앱 설치 없이 · 가입 없이 시작', 'Free · No app · No sign-up to start')}</p></div>
    <div className="guide-photo"><Image src={guide.image} alt={guide.h1[i]} fill sizes="(max-width: 760px) 90vw, 480px" priority /><span>{t('예시 사진', 'Sample photo')}</span></div>
   </section>
   <section className="guide-block"><h2>{t('이럴 때 필요해요', 'When this helps')}</h2><ul className="guide-pains">{guide.pains.map(p => <li key={p[0]}>{p[i]}</li>)}</ul></section>
   <section className="guide-block"><h2>{t(`${guide.kicker[0]}, 이렇게 해요`, 'How it works')}</h2>
    <ol className="guide-steps">{guide.steps.map(([title, body], n) => <li key={title[0]}><span>{String(n + 1).padStart(2, '0')}</span><div><h3>{title[i]}</h3><p>{body[i]}</p></div></li>)}</ol>
    <Link className="guide-cta" href={href}>{ko ? guide.cta.ko : guide.cta.en}<ArrowRight size={18} /></Link></section>
   <section className="guide-block"><h2>{t('Memonestia라서 좋은 점', 'Why Memonestia')}</h2><div className="guide-why">{guide.why.map(([title, body]) => <article key={title[0]}><Check size={18} /><h3>{title[i]}</h3><p>{body[i]}</p></article>)}</div>
    <p className="guide-explore"><Link href={`/?browse=1&lang=${lang}`}>{t('꾸민 앨범 예시 둘러보기', 'See sample decorated albums')}<ArrowUpRight size={16} /></Link></p></section>
   <section className="guide-block"><h2>{t('자주 묻는 질문', 'Questions')}</h2>{guide.faqs.map(([q, a]) => <details key={q[0]}><summary>{q[i]}</summary><p>{a[i]}</p></details>)}</section>
   <section className="guide-block guide-more"><h2>{t('이런 것도 만들 수 있어요', 'You can also make')}</h2><div>{guides.filter(g => g.slug !== guide.slug).map(g => <Link key={g.slug} href={`/${lang}/make/${g.slug}`}><strong>{g.kicker[i]}</strong><span>{g.h1[i]}</span></Link>)}</div></section>
  </main>
  <footer className="guide-footer"><Link className="guide-brand" href={`/${lang}`}>memonestia.</Link><div><Link href="/privacy">{t('개인정보', 'Privacy')}</Link><Link href="/terms">{t('이용약관', 'Terms')}</Link><Link href="/support">{t('문의', 'Support')}</Link></div></footer>
 </div>;
}
