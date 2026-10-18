import { randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { ApiError, ensureSession, hash, transaction } from '@/lib/server';
import { attachIdentity } from '@/lib/auth-core';
import { kakaoIdentity, KAKAO_STATE_COOKIE, safeReturnPath } from '@/lib/kakao-auth';

function sameState(a: string, b: string) { return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b)); }

export async function GET(request: Request) {
  const jar = await cookies(), params = new URL(request.url).searchParams;
  let saved: { state?: string; returnTo?: string } = {};
  try { saved = JSON.parse(jar.get(KAKAO_STATE_COOKIE)?.value || '{}'); } catch { /* A missing or broken cookie fails the state check below. */ }
  jar.set(KAKAO_STATE_COOKIE, '', { path: '/api/auth/kakao', maxAge: 0 });
  const returnTo = safeReturnPath(saved.returnTo || null);
  const back = (error?: string) => { const url = new URL(returnTo, request.url); if (error) url.searchParams.set('loginError', error); return Response.redirect(url, 303); };
  const code = params.get('code'), state = params.get('state') || '';
  if (params.get('error')) return back(params.get('error') === 'access_denied' ? 'LOGIN_CANCELLED' : 'LOGIN_FAILED');
  if (!code || !saved.state || !sameState(state, saved.state)) return back('LOGIN_FAILED');
  try {
    const identity = await kakaoIdentity(request, code);
    const guest = await ensureSession(request);
    const token = randomBytes(32).toString('hex'), oldToken = jar.get('snaproom_session')?.value;
    await transaction(async db => {
      const deleting = await db.query('SELECT 1 FROM snaproom.accounts a JOIN snaproom.viewers v ON v.id=a.viewer_id WHERE a.firebase_uid=$1 AND v.deletion_requested_at IS NOT NULL', [identity.uid]);
      if (deleting.rowCount) throw new ApiError(409, 'ACCOUNT_DELETION_PENDING');
      let owner;
      try { owner = await attachIdentity(db, guest, identity); }
      catch (error) { if (error instanceof Error && ['LOGOUT_FIRST', 'SESSION_CHANGED'].includes(error.message)) throw new ApiError(409, error.message); throw error; }
      if (oldToken) await db.query('DELETE FROM snaproom.sessions WHERE token_hash=$1', [hash(oldToken)]);
      await db.query("INSERT INTO snaproom.sessions(token_hash,viewer_id,expires_at) VALUES($1,$2,now()+interval '30 days')", [hash(token), owner]);
    });
    jar.set('snaproom_session', token, { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 2592000 });
    return back();
  } catch (error) {
    return back(error instanceof ApiError ? error.message : 'LOGIN_FAILED');
  }
}
