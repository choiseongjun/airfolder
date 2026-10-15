import 'server-only';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { ApiError, hash, pool, safe } from './server';
import type { PoolClient } from 'pg';

export const ADMIN_COOKIE = 'memolumi_admin';
export type Admin = { id: string; username: string; must_change_password: boolean; tokenHash: string };

export function adminOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new ApiError(403, 'INVALID_ORIGIN');
}
export async function requireAdmin(allowPasswordChange = false): Promise<Admin> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new ApiError(401, 'ADMIN_LOGIN_REQUIRED');
  const tokenHash = hash(token);
  const result = await pool().query(`SELECT a.id,a.username,a.must_change_password FROM snaproom.admin_sessions s JOIN snaproom.admin_users a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now() AND NOT a.disabled`, [tokenHash]);
  if (!result.rowCount) throw new ApiError(401, 'ADMIN_LOGIN_REQUIRED');
  if (result.rows[0].must_change_password && !allowPasswordChange) throw new ApiError(403, 'PASSWORD_CHANGE_REQUIRED');
  return { ...result.rows[0], tokenHash };
}
export async function setAdminCookie(request: Request, token: string) {
  (await cookies()).set(ADMIN_COOKIE, token, { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'strict', path: '/', maxAge: token ? 14400 : 0 });
}
export async function adminSafe(work: () => Promise<Response>) {
  // Keep request-time authentication outside prerendering before the generic error boundary.
  await connection();
  const response = await safe(work);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
export async function audit(db: Pick<PoolClient, 'query'>, adminId: string | null, action: string, subjectId: string | null = null, note = '') {
  await db.query('INSERT INTO snaproom.admin_audit(admin_id,action,subject_id,note) VALUES($1,$2,$3,$4)', [adminId, action, subjectId, note]);
}
export async function limitAdminAttempts(db: PoolClient, key: string, limit: number) {
  const result = await db.query(`INSERT INTO snaproom.admin_login_limits(key,attempts,expires_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN snaproom.admin_login_limits.expires_at<=now() THEN 1 ELSE snaproom.admin_login_limits.attempts+1 END,expires_at=CASE WHEN snaproom.admin_login_limits.expires_at<=now() THEN now()+interval '15 minutes' ELSE snaproom.admin_login_limits.expires_at END RETURNING attempts`, [key]);
  return result.rows[0].attempts <= limit;
}
