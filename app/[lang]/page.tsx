import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, Camera, Check, Heart, LockKeyhole, Plus, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import { copy, isPublicLanguage, publicMetadata, publicOrigin } from '@/lib/seo';
import { landingCopy } from './landing-copy';
import FramePreview from './frame-preview';
import LanguageSwitch from './language-switch';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  if (!isPublicLanguage(lang)) notFound();
  return publicMetadata(lang);
}

function Brand({ href }: { href: string }) {
  return <Link className="lp-brand" href={href} aria-label="Memolumi">
    <span className="lp-brand-icon"><Camera size={21} strokeWidth={1.6} aria-hidden="true" /></span>
    memolumi<span className="lp-brand-dot">.</span>
  </Link>;
}

export default async function Landing({ params }: Props) {
  const { lang } = await params;
  if (!isPublicLanguage(lang)) notFound();
  const t = landingCopy[lang];
  const origin = publicOrigin();
  const appHref = `/?lang=${lang}`;
  const structured = {
    '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Memolumi',
    description: copy[lang].description, url: `${origin}/${lang}`,
    applicationCategory: 'MultimediaApplication', operatingSystem: 'Web', inLanguage: lang,
    featureList: t.gatherSteps.map(step => step[0]),
  };

  return <div className="lp-page">
    {origin && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />}
    <a className="lp-skip" href="#main">{t.skip}</a>
    <header className="lp-nav">
      <Brand href={`/${lang}`} />
      <nav className="lp-nav-middle" aria-label={lang === 'ko' ? '소개페이지 메뉴' : 'Page navigation'}>
        <a href="#our-story">{t.storyLink}</a><a href="#how-it-works">{t.howLink}</a>
      </nav>
      <div className="lp-nav-end">
        <LanguageSwitch lang={lang} />
        <Link className="lp-nav-cta" href={appHref}>{t.open}<ArrowUpRight size={15} aria-hidden="true" /></Link>
      </div>
    </header>
    <main id="main">
      <section className="lp-hero" aria-labelledby="hero-title">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow"><span />FOR YOUR PEOPLE. FOR YOUR MOMENTS.</p>
          <h1 id="hero-title">{t.headline[0]}<br /><em>{t.headline[1]}</em></h1>
          <p className="lp-hero-intro">{t.intro[0]}<br />{t.intro[1]}</p>
          <Link className="lp-button" href={appHref}>{t.start}<ArrowUpRight size={19} aria-hidden="true" /></Link>
          <span className="lp-start-hint">{t.hint}</span>
        </div>
        <div className="lp-photo-fan">
          <span className="lp-photo-doodle lp-photo-doodle--star" aria-hidden="true">✳</span>
          {(['picnic', 'friends', 'sea'] as const).map((photo, index) => <figure className={`lp-polaroid lp-polaroid--${index}`} key={photo}>
            <div className="lp-polaroid-image"><Image src={`/landing/${photo}.webp`} alt={t.photoAlts[index]} fill sizes="(max-width: 600px) 58vw, 330px" loading="eager" fetchPriority={index === 1 ? 'high' : 'auto'} /></div>
            <figcaption><span>{t.heroPhotos[index]}</span><Heart size={15} strokeWidth={1.3} aria-hidden="true" /></figcaption>
            <div className="lp-polaroid-bottom"><span>OUR LITTLE MOMENTS</span><span>0{index + 1}</span></div>
          </figure>)}
          <span className="lp-photo-note">{t.handwritten}<span aria-hidden="true">⤴</span></span>
          <span className="lp-photo-doodle lp-photo-doodle--sun" aria-hidden="true">☀</span>
        </div>
        <a className="lp-scroll" href="#our-story"><span>{t.scroll}</span><ArrowDown size={15} aria-hidden="true" /></a>
      </section>
      <section className="lp-manifesto lp-section" id="our-story" aria-labelledby="story-title">
        <span className="lp-small-flower" aria-hidden="true">✳</span>
        <p className="lp-eyebrow">LIFE IS BETTER WHEN WE KEEP IT TOGETHER</p>
        <h2 id="story-title">{t.manifesto.map(line => <span key={line}>{line}<br /></span>)}<strong>{t.manifestoEnd}</strong></h2>
      </section>
      <section className="lp-gather lp-section" id="how-it-works" aria-labelledby="gather-title">
        <div className="lp-album-scene">
          <div className="lp-album-back" aria-hidden="true" />
          <div className="lp-album-demo">
            <div className="lp-album-top"><span><span className="lp-tiny-dot" />SHARED ALBUM</span><span>01 / 03</span></div>
            <h3>{t.albumName}</h3><p>{t.albumSubtitle}</p>
            <div className="lp-album-grid">
              <div className="lp-album-photo lp-album-photo--wide"><Image src="/landing/friends.webp" alt="" fill sizes="(max-width: 600px) 80vw, 420px" /></div>
              <div className="lp-album-photo"><Image src="/landing/picnic.webp" alt="" fill sizes="220px" /></div>
              <div className="lp-album-photo"><Image src="/landing/sea.webp" alt="" fill sizes="220px" /></div>
            </div>
            <div className="lp-album-bottom"><div className="lp-member-dots" aria-hidden="true"><span>J</span><span>S</span><span>M</span><span><Plus size={12} /></span></div><span>{t.together}</span><Heart size={17} aria-hidden="true" /></div>
          </div>
          <span className="lp-scene-caption">{t.example}</span>
          <span className="lp-album-sticker" aria-hidden="true">better<br /><i>together</i></span>
        </div>
        <div className="lp-feature-copy">
          <p className="lp-eyebrow">01 — TOGETHER, IN ONE PLACE</p>
          <h2 id="gather-title">{t.gatherTitle[0]}<br /><em>{t.gatherTitle[1]}</em></h2>
          <p className="lp-body-copy">{t.gatherBody}</p>
          <ol className="lp-how-steps">{t.gatherSteps.map(([title, body], index) => <li key={title}>
            <span className="lp-step-index">0{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div>
          </li>)}</ol>
        </div>
      </section>
      <section className="lp-create" aria-labelledby="create-title">
        <div className="lp-create-inner lp-section">
          <div className="lp-feature-copy">
            <p className="lp-eyebrow">02 — MAKE IT A LITTLE MORE YOU</p>
            <h2 id="create-title">{t.cardTitle[0]}<br /><em>{t.cardTitle[1]}</em></h2>
            <p className="lp-body-copy">{t.cardBody}</p>
            <Link className="lp-text-link" href={appHref}>{t.cardLink}<ArrowRight size={19} aria-hidden="true" /></Link>
            <p className="lp-frame-invitation"><Sparkles size={16} aria-hidden="true" />{t.cardTip}</p>
          </div>
          <FramePreview lang={lang} />
        </div>
      </section>
      <section className="lp-privacy-section lp-section" aria-labelledby="privacy-title">
        <div className="lp-privacy-photo"><Image src="/landing/sea.webp" alt={t.photoAlts[2]} fill sizes="(max-width: 760px) 100vw, 48vw" /><span className="lp-photo-location">SOMEWHERE WITH YOU.</span></div>
        <div className="lp-privacy-copy">
          <div className="lp-lock"><LockKeyhole size={25} strokeWidth={1.4} aria-hidden="true" /></div>
          <p className="lp-eyebrow">03 — JUST YOUR PEOPLE</p>
          <h2 id="privacy-title">{t.privacyTitle[0]}<br /><em>{t.privacyTitle[1]}</em></h2>
          <p className="lp-body-copy">{t.privacyBody}</p>
          <ul>{t.privacyTags.map(tag => <li key={tag}><Check size={16} aria-hidden="true" />{tag}</li>)}</ul>
        </div>
      </section>
      <section className="lp-faq lp-section" aria-labelledby="faq-title">
        <div><p className="lp-eyebrow">A FEW THINGS TO KNOW</p><h2 id="faq-title">{t.faqTitle}</h2><span className="lp-faq-flower" aria-hidden="true">✳</span></div>
        <div className="lp-faq-items">{t.faqs.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={18} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
      </section>
      <section className="lp-finale" aria-labelledby="final-title">
        <div className="lp-finale-stamp" aria-hidden="true"><Camera size={28} strokeWidth={1.3} /><span>KEEP THE GOOD DAYS</span></div>
        <p className="lp-eyebrow">TODAY WILL MAKE A GOOD MEMORY.</p>
        <h2 id="final-title">{t.finalTitle[0]}<br /><em>{t.finalTitle[1]}</em></h2>
        <p>{t.finalNote}</p>
        <Link className="lp-button" href={appHref}>{t.start}<ArrowUpRight size={19} aria-hidden="true" /></Link>
      </section>
    </main>
    <footer className="lp-footer"><div><Brand href={`/${lang}`} /><p>{t.footerLine}</p></div><nav aria-label={lang === 'ko' ? '서비스 안내' : 'Service information'}>
      <Link href="/privacy">{t.privacy}</Link><Link href="/terms">{t.terms}</Link><Link href="/support">{t.support}</Link>
    </nav><span className="lp-copyright">© 2026 Memolumi</span></footer>
  </div>;
}
