import { notFound } from 'next/navigation';
import { Gaegu, Geist, Noto_Serif_KR } from 'next/font/google';
import { isPublicLocale, publicLocales, publicLocaleTags } from '@/lib/public-locale';
import WebAnalytics from '../web-analytics';
import './landing.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-landing-sans', display: 'swap' });
// Handwriting for the cute headings; Korean glyphs load by unicode-range, so skip the latin-only preload.
const hand = Gaegu({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-hand', display: 'swap', preload: false });
const editorial = Noto_Serif_KR({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-editorial', display: 'swap', preload: false });

export function generateStaticParams() { return publicLocales.map(lang => ({ lang })); }

export default async function PublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isPublicLocale(lang)) notFound();
  return <html lang={publicLocaleTags[lang]} className={`${sans.variable} ${editorial.variable} ${hand.variable}`}><body>{children}<WebAnalytics /></body></html>;
}
