import Link from "next/link";
import { notFound } from 'next/navigation';
import { copy, isPublicLanguage, publicMetadata, publicOrigin } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isPublicLanguage(lang)) notFound();
  return publicMetadata(lang);
}

export default async function Landing({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isPublicLanguage(lang)) notFound();
  const t = copy[lang]; const origin = publicOrigin();
  const structured = { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Snaproom', description: t.description, url: `${origin}/${lang}`, applicationCategory: 'MultimediaApplication', operatingSystem: 'Web', inLanguage: lang, featureList: t.steps.map(s => s[0]) };
  return <>
    {origin && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }}/>}
    <Link className="skip" href="#main">{lang === 'ko' ? '본문으로 이동' : 'Skip to content'}</Link>
    <header className="landing-nav"><Link className="logo" href={`/${lang}`}>snaproom<span>.</span></Link><nav aria-label={lang === 'ko' ? '언어와 앱' : 'Language and app'}><Link href="/en" hrefLang="en" lang="en" aria-current={lang === 'en' ? 'page' : undefined}>EN</Link><Link href="/ko" hrefLang="ko" lang="ko" aria-current={lang === 'ko' ? 'page' : undefined}>한국어</Link><Link className="nav-open" href={`/?lang=${lang}`}>{t.cta} ↗</Link></nav></header>
    <main id="main"><section className="hero"><div><p className="eyebrow">{t.eyebrow}</p><h1>{t.heading}</h1><p className="intro">{t.intro}</p><Link className="cta" href={`/?lang=${lang}`}>{t.cta} <span>↗</span></Link><p className="privacy">◉ {t.footer}</p></div><div className="folder-art" aria-hidden="true"><div className="folder-tab"/><div className="folder-paper"><span>01 / {lang === 'ko' ? '우리의 여행' : 'OUR NEXT TRIP'}</span><div className="landscape"><i/><b/></div><p>{lang === 'ko' ? '순간은 쌓이고, 정리는 끝나고.' : 'Memories in. Sorting done.'}</p></div><span className="private-pill">● {lang === 'ko' ? '나만 보기' : 'Only me'}</span></div></section>
    <section className="steps"><h2>{t.stepsTitle}</h2><div className="three-grid">{t.steps.map(([title, body], i) => <article key={title}><span className="step-number">0{i + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="uses"><h2>{t.usesTitle}</h2><div className="four-grid">{t.uses.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="faq"><h2>{t.faqTitle}</h2>{t.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    <section className="end"><p>{t.footer}</p><Link className="cta" href={`/?lang=${lang}`}>{t.cta} ↗</Link></section></main><footer className="landing-footer"><Link className="logo" href={`/${lang}`}>snaproom<span>.</span></Link><span>Shoot anywhere. Gather here.</span></footer>
  </>;
}
