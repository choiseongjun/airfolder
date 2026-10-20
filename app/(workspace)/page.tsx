import WorkspaceLoading from '../workspace-loading';
import { publicMetadata } from '@/lib/seo';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { requestLocale } from '@/lib/request-locale';
import { hash, pool, sessionToken } from '@/lib/server';
import Workspace from './workspace-client';
import EntryLanding from './entry-landing';
import HomeFeed from '../home-feed';
import { redirect } from 'next/navigation';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Links that open a specific workspace flow (sign-in sheet, explore, a shared album…) skip the landing.
const workspaceParams = ['login', 'loginError', 'returnTo', 'browse', 'quick', 'studio', 'help', 'invite', 'album', 'group', 'room', 'photo', 'section', 'view'];

export async function generateMetadata({ searchParams }: Props) {
  const { lang } = await searchParams;
  const metadata = publicMetadata(await requestLocale(lang));
  return { ...metadata, alternates: undefined, robots: { index: false, follow: false }, openGraph: { ...metadata.openGraph, url: undefined } };
}

export default function Page(props: Props) {
  return <Suspense fallback={<main><WorkspaceLoading/></main>}>
    <LocalizedWorkspace {...props} />
  </Suspense>;
}

async function visitor(): Promise<'guest' | 'member' | 'workspace'> {
  // Native shells authenticate with a bearer token and keep their own workspace flow.
  if ((await headers()).has('authorization')) return 'workspace';
  try {
    const token = await sessionToken();
    if (!token) return 'guest';
    const result = await pool().query('SELECT 1 FROM snaproom.sessions s JOIN snaproom.accounts a ON a.viewer_id=s.viewer_id WHERE s.token_hash=$1 AND s.expires_at>now() LIMIT 1', [hash(token)]);
    return result.rowCount ? 'member' : 'guest';
  } catch {
    // If the check fails, the workspace shows its own connection state.
    return 'workspace';
  }
}

async function LocalizedWorkspace({ searchParams }: Props) {
  const params = await searchParams;
  const { lang, browse, invite } = params;
  const locale = await requestLocale(lang);
  if (typeof invite === 'string' && /^[a-f\d]{64}$/.test(invite) && browse !== '1') redirect(`/join/${invite}?lang=${locale}`);
  // The landing and crew home are Korean-only for now; English visitors keep the existing workspace.
  if (locale === 'ko' && !workspaceParams.some(name => params[name] !== undefined)) {
    const who = await visitor();
    if (who === 'guest') return <EntryLanding/>;
    if (who === 'member') return <HomeFeed/>;
  }
  return <Workspace key={browse==='1'?'browse':'workspace'} initialLocale={locale} browsing={browse==='1'} />;
}
