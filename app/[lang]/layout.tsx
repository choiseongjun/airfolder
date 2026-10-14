import { notFound } from 'next/navigation';
import { isPublicLanguage } from '@/lib/seo';
import './landing.css';

export function generateStaticParams() { return [{ lang: 'en' }, { lang: 'ko' }]; }

export default async function PublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isPublicLanguage(lang)) notFound();
  return <html lang={lang}><body>{children}</body></html>;
}
