import type { MetadataRoute } from 'next';
import { publicOrigin } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots {
  const origin = publicOrigin();
  // Let crawlers read the workspace's noindex tag; blocking it here hides that tag.
  return origin ? { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: `${origin}/sitemap.xml` } : { rules: { userAgent: '*', disallow: '/' } };
}
