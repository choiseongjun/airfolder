import WorkspaceLoading from '../workspace-loading';
import { publicMetadata } from '@/lib/seo';
import { Suspense } from 'react';
import { cookies, headers } from 'next/headers';
import MemoryIntro from '../memory-intro';
import { requestLocale } from '@/lib/request-locale';
import Workspace from './workspace-client';
import KeepsakeLogin from '../keepsake-login';
import KeepsakeWorkspace from '../keepsake-workspace';
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

async function LocalizedWorkspace({ searchParams }: Props) {
  const params = await searchParams;
  const { lang, browse, invite, screen } = params;
  const locale = await requestLocale(lang);
  if (typeof invite === 'string' && /^[a-f\d]{64}$/.test(invite) && browse !== '1') redirect(`/join/${invite}?lang=${locale}`);
  if (params.login === '1' || params.loginError !== undefined) return <KeepsakeLogin locale={locale}/>;
  if (params.section === 'rooms' && params.album === undefined) redirect(`/?lang=${locale}&home=1${typeof params.group === 'string' ? `&group=${encodeURIComponent(params.group)}` : ''}`);
  if (params.home === '1' && (screen === 'photos' || screen === 'behind' || screen === 'settings')) redirect(`/crew/${screen}?lang=${locale}&group=${encodeURIComponent(typeof params.group === 'string' ? params.group : 'personal')}`);
  // Both languages enter the same crew screens.
  if (typeof params.album === 'string' && params.legacy !== '1' && params.login === undefined && params.loginError === undefined) redirect(`/library?lang=${locale}&album=${encodeURIComponent(params.album)}`);
  if ((params.quick === '1' || params.studio === '1') && params.legacy !== '1') redirect(`/make?lang=${locale}&stage=create`);
  const requestedHome = params.home === '1';
  // Group-only links select a crew in the current feed, not the legacy workspace.
  // Keep explicit album, login, upload and invitation flows on their own routes.
  const requestedGroupHome = typeof params.group === 'string' &&
    !workspaceParams.some(name => name !== 'group' && name !== 'home' && params[name] !== undefined);
  const requestedAlbumView = typeof params.album === 'string' && (params.view === 'timeline' || params.view === 'photos' || params.view === 'book');
  // The post-login return URL is an explicit request for the Stitch crew home.
  // Render it directly; a transient server-side session lookup failure must not
  // send a signed-in visitor back to the generic workspace screen.
  if ((requestedHome || requestedGroupHome) && !requestedAlbumView) return <KeepsakeWorkspace locale={locale}/>;
  // First-time and returning web visitors enter the same feed. Native bearer clients
  // and explicit album / invitation / sign-in links retain their existing flows.
  if (!workspaceParams.some(name => params[name] !== undefined) && !(await headers()).has('authorization')) {
    if (!(await cookies()).has('snaproom_session')) return <MemoryIntro locale={locale}/>;
    return <KeepsakeWorkspace locale={locale}/>;
  }
  return <Workspace key={browse==='1'?'browse':'workspace'} initialLocale={locale} browsing={browse==='1'} initialLogin={params.login === '1' || params.loginError !== undefined || requestedHome} />;
}
