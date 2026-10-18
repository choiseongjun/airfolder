import 'server-only';
import { randomBytes } from 'node:crypto';
import type { Identity } from './auth-core';

// The REST API key is sent to Kakao in the browser's authorize URL anyway, so it is public by design.
export const kakaoClientId = () => process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY || '';
export const KAKAO_STATE_COOKIE = 'snaproom_kakao_oauth';

export function kakaoRedirectUri(request: Request) {
  return process.env.KAKAO_REDIRECT_URI || new URL('/api/auth/kakao/callback', request.url).toString();
}

/** Only same-site paths may be returned to after sign-in. */
export function safeReturnPath(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') && value.length <= 512 ? value : '/';
}

export function newKakaoState() { return randomBytes(24).toString('hex'); }

export function kakaoAuthorizeUrl(request: Request, state: string) {
  const url = new URL('https://kauth.kakao.com/oauth/authorize');
  url.searchParams.set('client_id', kakaoClientId());
  url.searchParams.set('redirect_uri', kakaoRedirectUri(request));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  return url.toString();
}

/** Exchanges the authorization code and returns the verified Kakao identity. */
export async function kakaoIdentity(request: Request, code: string): Promise<Identity> {
  const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: kakaoClientId(), redirect_uri: kakaoRedirectUri(request), code });
  if (process.env.KAKAO_CLIENT_SECRET) body.set('client_secret', process.env.KAKAO_CLIENT_SECRET);
  const token = await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body, signal: AbortSignal.timeout(10000) });
  if (!token.ok) throw new Error('KAKAO_TOKEN_FAILED');
  const { access_token: accessToken } = await token.json() as { access_token?: string };
  if (!accessToken) throw new Error('KAKAO_TOKEN_FAILED');
  const me = await fetch('https://kapi.kakao.com/v2/user/me', { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10000) });
  if (!me.ok) throw new Error('KAKAO_PROFILE_FAILED');
  const user = await me.json() as { id?: number; properties?: { nickname?: string }; kakao_account?: { profile?: { nickname?: string } } };
  if (!Number.isSafeInteger(user.id)) throw new Error('KAKAO_PROFILE_FAILED');
  const name = (user.kakao_account?.profile?.nickname || user.properties?.nickname || '').trim().slice(0, 80);
  // Email is never requested; accounts are matched by Kakao's user id only.
  return { uid: `kakao:${user.id}`, provider: 'kakao', email: null, name: name || '카카오 사용자' };
}
