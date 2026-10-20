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
const workspaceParams = ['login', 'loginError', 'returnTo', 'browse', 'quick', 'studio', 'help', 'invite', 'album', 'group', 'room', 'photo', 'section', 'view', 'home'];

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
  const { lang, browse, invite, screen } = params;
  const locale = await requestLocale(lang);
  if (typeof invite === 'string' && /^[a-f\d]{64}$/.test(invite) && browse !== '1') redirect(`/join/${invite}?lang=${locale}`);
  if (locale === 'ko' && params.section === 'rooms' && params.album === undefined) redirect('/?lang=ko&home=1');
  if (locale === 'ko' && params.home === '1' && (screen === 'photos' || screen === 'behind' || screen === 'settings')) redirect(`/crew/${screen}`);
  // The landing and crew home are Korean-only for now; English visitors keep the existing workspace.
  const requestedHome = params.home === '1';
  const requestedAlbumView = typeof params.album === 'string' && (params.view === 'timeline' || params.view === 'photos' || params.view === 'book');
  // The post-login return URL is an explicit request for the Stitch crew home.
  // Render it directly; a transient server-side session lookup failure must not
  // send a signed-in visitor back to the generic workspace screen.
  if (locale === 'ko' && requestedHome && !requestedAlbumView) return <HomeFeed/>;
  if (locale === 'ko' && ((requestedHome && !requestedAlbumView) || !workspaceParams.some(name => params[name] !== undefined))) {
    const who = await visitor();
    if (who === 'guest' && !requestedHome && params.loginError === undefined) return <EntryLanding/>;
    if (who === 'member') return <HomeFeed/>;
  }
  return <Workspace key={browse==='1'?'browse':'workspace'} initialLocale={locale} browsing={browse==='1'} initialLogin={params.login === '1' || params.loginError !== undefined || requestedHome} />;
}
