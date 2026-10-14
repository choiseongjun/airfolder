import type { MetadataRoute } from 'next';
import { publicOrigin } from '@/lib/seo';
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = publicOrigin();
  if (!origin) return [];
  return ['en', 'ko'].map(lang => ({ url: `${origin}/${lang}`, alternates: { languages: { en: `${origin}/en`, ko: `${origin}/ko`, 'x-default': `${origin}/en` } } }));
}
