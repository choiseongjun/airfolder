import type { MetadataRoute } from 'next';
import { publicOrigin, publicAlternates } from '@/lib/seo';
import { publicLocales } from '@/lib/public-locale';
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicOrigin();
  if (!origin) return [];
  return [
    ...publicLocales.map(lang => ({ url: `${origin}/${lang}`, alternates: { languages: publicAlternates(origin) } })),
    ...['en', 'ko'].map(lang => ({ url: `${origin}/${lang}/hosts`, alternates: { languages: { en: `${origin}/en/hosts`, ko: `${origin}/ko/hosts`, 'x-default': `${origin}/en/hosts` } } })),
  ];
}
