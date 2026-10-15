'use client';

import Link from 'next/link';
import { saveBrowserLocale } from '@/lib/browser-locale';
import { publicLocales, publicLocaleTags, publicLanguageCookie, type PublicLocale } from '@/lib/public-locale';

export default function LanguageSwitch({ lang }: { lang: PublicLocale }) {
  return <nav className="lp-languages" aria-label="Language / 언어">
    {publicLocales.map(locale => <Link key={locale} href={`/${locale}`} hrefLang={publicLocaleTags[locale]} lang={publicLocaleTags[locale]}
      aria-label={{ ko: '한국어', en: 'English', 'en-ph': 'English — Philippines', id: 'Bahasa Indonesia' }[locale]}
      aria-current={lang === locale ? 'page' : undefined} onClick={() => {
        saveBrowserLocale(locale === 'ko' ? 'ko' : 'en');
        try {
          document.cookie = `${publicLanguageCookie}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
        } catch { /* The explicit language link still works without cookie access. */ }
      }}>{locale === 'en-ph' ? 'PH' : locale.toUpperCase()}</Link>)}
  </nav>;
}
