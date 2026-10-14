import type { Locale, Session, Workspace } from './model';

// Served under the web app's origin; use its HttpOnly cookie, never a native token in localStorage.
export function serverOrigin() { return window.location.origin; }
export function sessionHeaders(_session: Session): Record<string, string> { return {}; }
export async function request<T>(path: string, init: RequestInit = {}, _session?: Session): Promise<T> {
  const response = await fetch(path, { ...init, credentials: 'same-origin', cache: 'no-store', headers: { ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...init.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'SERVER_ERROR');
  return data;
}
let starting: Promise<Session> | null = null;
export function getSession(): Promise<Session> {
  return starting ??= (async () => {
    const { viewerId } = await request<{ viewerId: string }>('/api/session', { method: 'POST' });
    return { viewerId, token: `web:${viewerId}`, expiresAt: Number.MAX_SAFE_INTEGER, origin: serverOrigin() };
  })().finally(() => { starting = null; });
}
export async function connectAccount(_locale: Locale, expectedViewerId?: string): Promise<Session> {
  const session = await getSession();
  if (expectedViewerId && expectedViewerId !== session.viewerId) throw new Error('QUEUED_ACCOUNT_MISMATCH');
  const workspace = await request<Workspace>('/api/workspace');
  if (!workspace.account) throw new Error('WEB_LOGIN_REQUIRED');
  return session;
}
export async function disconnectAccount() { await request('/api/auth/logout', { method: 'POST' }); }

export async function forgetSession(){starting=null;}
