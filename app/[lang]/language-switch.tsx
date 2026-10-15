'use client';

import Link from 'next/link';
import { saveBrowserLocale } from '@/lib/browser-locale';
import type { PublicLanguage } from '@/lib/seo';

export default function LanguageSwitch({ lang }: { lang: PublicLanguage }) {
  return <nav className="lp-languages" aria-label="Language / 언어">
    <Link href="/ko" hrefLang="ko" lang="ko" aria-current={lang === 'ko' ? 'page' : undefined} onClick={() => saveBrowserLocale('ko')}>KO</Link>
    <span aria-hidden="true">/</span>
    <Link href="/en" hrefLang="en" lang="en" aria-current={lang === 'en' ? 'page' : undefined} onClick={() => saveBrowserLocale('en')}>EN</Link>
  </nav>;
}
