import { Suspense } from 'react';
import { requestLocale } from '@/lib/request-locale';
import Workspace from './workspace-client';
import { redirect } from 'next/navigation';

type Props = { searchParams: Promise<{ lang?: string | string[]; browse?: string | string[]; invite?: string | string[] }> };

export default function Page(props: Props) {
  return <Suspense fallback={<main aria-busy="true" style={{ padding: 32 }}>Memolumi</main>}>
    <LocalizedWorkspace {...props} />
  </Suspense>;
}

async function LocalizedWorkspace({ searchParams }: Props) {
  const { lang, browse, invite } = await searchParams;
  if (typeof invite === 'string' && /^[a-f\d]{64}$/.test(invite) && browse !== '1') redirect(`/join/${invite}?lang=${await requestLocale(lang)}`);
  return <Workspace key={browse==='1'?'browse':'workspace'} initialLocale={await requestLocale(lang)} browsing={browse==='1'} />;
}
