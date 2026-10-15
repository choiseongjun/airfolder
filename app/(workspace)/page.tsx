import { Suspense } from 'react';
import { requestLocale } from '@/lib/request-locale';
import Workspace from './workspace-client';

type Props = { searchParams: Promise<{ lang?: string | string[]; browse?: string | string[] }> };

export default function Page(props: Props) {
  return <Suspense fallback={<main aria-busy="true" style={{ padding: 32 }}>Memolumi</main>}>
    <LocalizedWorkspace {...props} />
  </Suspense>;
}

async function LocalizedWorkspace({ searchParams }: Props) {
  const { lang, browse } = await searchParams;
  return <Workspace key={browse==='1'?'browse':'workspace'} initialLocale={await requestLocale(lang)} browsing={browse==='1'} />;
}
