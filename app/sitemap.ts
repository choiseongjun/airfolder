import type { MetadataRoute } from 'next';
import { publicOrigin } from '@/lib/seo';
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicOrigin();
  if (!origin) return [];
  return ['', '/hosts'].flatMap(path => ['en', 'ko'].map(lang => ({ url: `${origin}/${lang}${path}`, alternates: { languages: { en: `${origin}/en${path}`, ko: `${origin}/ko${path}`, 'x-default': `${origin}/en${path}` } } })));
}
