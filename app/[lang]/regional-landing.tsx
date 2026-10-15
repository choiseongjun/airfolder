import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Camera, Check, Plus } from 'lucide-react';
import { publicOrigin, regionalMetadata } from '@/lib/seo';
import { publicLocaleTags } from '@/lib/public-locale';
import LanguageSwitch from './language-switch';
import LandingMotion from './landing-motion';
import RegionalPreview from './regional-preview';
import { regionalCopy, type RegionalLocale } from './regional-copy';
import './regional.css';

export default function RegionalLanding({ locale }: { locale: RegionalLocale }) {
  const t = regionalCopy[locale];
  const origin = publicOrigin();
  const appHref = '/?lang=en';
  const schema = { '@context': 'https://schema.org', '@type': 'WebPage', name: regionalMetadata[locale].title, url: `${origin}/${locale}`, inLanguage: publicLocaleTags[locale], description: regionalMetadata[locale].description, about: { '@type': 'WebApplication', name: 'Memonestia', applicationCategory: 'MultimediaApplication', operatingSystem: 'Web', inLanguage: ['en', 'ko'] } };
  const brand = <><span className="lp-brand-icon"><Camera size={21} strokeWidth={1.6} aria-hidden="true" /></span>memonestia<span className="lp-brand-dot">.</span></>;
  return <div className="lp-page regional-page">
    <LandingMotion />{origin && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />}
    <a className="lp-skip" href="#main">{t.skip}</a>
    <header className="lp-nav"><Link className="lp-brand" href={`/${locale}`} aria-label="Memonestia">{brand}</Link><nav className="lp-nav-middle" aria-label={t.how}><a href="#how-it-works">{t.how}</a><a href="#memory-studio">{t.studio}</a></nav><div className="lp-nav-end"><LanguageSwitch lang={locale} /><Link className="lp-nav-cta" href={appHref}>{t.open}<ArrowUpRight size={15} /></Link></div></header>
    <main id="main">
      <section className="lp-hero" aria-labelledby="regional-title"><div className="lp-hero-copy"><p className="lp-eyebrow"><span />{t.region}</p><h1 id="regional-title">{t.headline[0]}<br /><em>{t.headline[1]}</em></h1><p className="lp-hero-intro">{t.intro}</p><div className="lp-hero-actions"><Link className="lp-button" href={appHref}>{t.start}<ArrowUpRight size={19} /></Link><a className="lp-try-studio" href="#memory-studio">{t.studio} ↘</a></div><p className="lp-start-hint">{t.hint}</p><p className="regional-app-language">{t.appLanguage}</p></div>
        <div className="regional-photo-scene">{['friends', 'picnic', 'sea'].map((photo, i) => <figure key={photo} className={`regional-photo regional-photo--${i}`}><div><Image src={`/landing/${photo}.webp`} alt={t.photoAlts[i]} fill sizes="(max-width:760px) 60vw, 310px" priority={i === 0} /></div><figcaption>{t.photoNames[i]}</figcaption></figure>)}<span className="regional-example">{t.example}</span></div>
      </section>
      <section className="lp-manifesto lp-section" data-reveal><p className="lp-eyebrow">{t.region}</p><h2>{t.story[0]}<br /><strong>{t.story[1]}</strong></h2><p className="regional-story-body">{t.storyBody}</p></section>
      <section className="regional-uses lp-section"><h2>{t.usesTitle}</h2><div>{t.uses.map(([title, body], i) => <article key={title}><span>0{i + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
      <section className="regional-how lp-section" id="how-it-works"><h2>{t.stepsTitle}</h2><ol>{t.steps.map(([title, body], i) => <li key={title}><span className="lp-step-index">0{i + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></section>
      <section className="lp-create" id="memory-studio"><div className="lp-create-inner lp-section"><div className="lp-feature-copy"><p className="lp-eyebrow">{t.studio}</p><h2>{t.cardTitle[0]}<br /><em>{t.cardTitle[1]}</em></h2><p className="lp-body-copy">{t.cardBody}</p></div><RegionalPreview locale={locale} /></div></section>
      <section className="regional-privacy lp-section" data-reveal><Check size={28} aria-hidden="true" /><h2>{t.privacyTitle}</h2><p>{t.privacyBody}</p></section>
      <section className="lp-faq lp-section"><div><p className="lp-eyebrow">MEMONESTIA</p><h2>{t.faqTitle}</h2></div><div className="lp-faq-items">{t.faqs.map(([q, a]) => <details key={q}><summary>{q}<Plus size={18} /></summary><p>{a}</p></details>)}</div></section>
      <section className="lp-finale"><p className="lp-eyebrow">{t.region}</p><h2>{t.finalTitle[0]}<br /><em>{t.finalTitle[1]}</em></h2><p>{t.finalNote}</p><Link className="lp-button" href={appHref}>{t.start}<ArrowUpRight size={19} /></Link><p className="regional-app-language">{t.appLanguage}</p></section>
    </main>
    <footer className="lp-footer"><div><Link className="lp-brand" href={`/${locale}`}>{brand}</Link><p>{t.footer}</p></div><nav><Link href="/privacy">{t.privacy}</Link><Link href="/terms">{t.terms}</Link><Link href="/support">{t.support}</Link></nav><span className="lp-copyright">© 2026 Memonestia</span></footer>
  </div>;
}
