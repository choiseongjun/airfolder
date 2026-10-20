import { notFound } from 'next/navigation';
import { Gaegu, Geist } from 'next/font/google';
import { isPublicLocale, publicLocales, publicLocaleTags } from '@/lib/public-locale';
import WebAnalytics from '../web-analytics';
import KakaoBrowserEscape from '../kakao-browser-escape';
import './landing.css';
import '../brand.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-landing-sans', display: 'swap' });
// Handwriting for the cute headings; Korean glyphs load by unicode-range, so skip the latin-only preload.
const hand = Gaegu({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-hand', display: 'swap', preload: false });

export function generateStaticParams() { return publicLocales.map(lang => ({ lang })); }

export default async function PublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isPublicLocale(lang)) notFound();
  return <html lang={publicLocaleTags[lang]} className={`${sans.variable} ${hand.variable}`}><body><KakaoBrowserEscape />{children}<WebAnalytics /></body></html>;
}
