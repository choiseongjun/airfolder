import type { MetadataRoute } from 'next';
import { publicOrigin, publicAlternates } from '@/lib/seo';
import { publicLocales } from '@/lib/public-locale';
import { guides } from './[lang]/make/guides';
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicOrigin();
  if (!origin) return [];
  return [
    ...publicLocales.map(lang => ({ url: `${origin}/${lang}`, alternates: { languages: publicAlternates(origin) } })),
    ...['en', 'ko'].map(lang => ({ url: `${origin}/${lang}/hosts`, alternates: { languages: { en: `${origin}/en/hosts`, ko: `${origin}/ko/hosts`, 'x-default': `${origin}/en/hosts` } } })),
    ...['', ...guides.map(g => `/${g.slug}`)].flatMap(path => ['ko', 'en'].map(lang => ({ url: `${origin}/${lang}/make${path}`, alternates: { languages: { en: `${origin}/en/make${path}`, ko: `${origin}/ko/make${path}`, 'x-default': `${origin}/en/make${path}` } } }))),
  ];
}
