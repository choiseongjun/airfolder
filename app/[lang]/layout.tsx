import { notFound } from 'next/navigation';
import { Geist, Noto_Serif_KR } from 'next/font/google';
import { isPublicLanguage } from '@/lib/seo';
import './landing.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-landing-sans', display: 'swap' });
const editorial = Noto_Serif_KR({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-editorial', display: 'swap', preload: false });

export function generateStaticParams() { return [{ lang: 'en' }, { lang: 'ko' }]; }

export default async function PublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isPublicLanguage(lang)) notFound();
  return <html lang={lang} className={`${sans.variable} ${editorial.variable}`}><body>{children}</body></html>;
}
