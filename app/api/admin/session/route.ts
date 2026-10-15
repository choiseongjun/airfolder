import { randomBytes } from 'node:crypto';
import { ApiError, hash, json, pool, transaction } from '@/lib/server';
import { adminOrigin, adminSafe, audit, limitAdminAttempts, requireAdmin, setAdminCookie } from '@/lib/admin';
import { verifyAdminPassword } from '@/scripts/admin-password.mjs';

export async function GET() { return adminSafe(async () => {
  const admin = await requireAdmin(true);
  return Response.json({ username: admin.username, mustChangePassword: admin.must_change_password });
}); }
export async function POST(request: Request) { return adminSafe(async () => {
  adminOrigin(request);
  const body = await json(request);
  if (typeof body.username !== 'string' || !/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(body.username) || typeof body.password !== 'string' || Buffer.byteLength(body.password) > 256) throw new ApiError(401, 'INVALID_CREDENTIALS');
  const username = body.username.toLowerCase();
  // Shared database limits cover all instances. Client-supplied forwarding headers never bypass these limits.
  const allowed = await transaction(async db => {
    const global = await limitAdminAttempts(db, 'login:global', 100);
    const account = await limitAdminAttempts(db, 'login:' + hash(username), 10);
    return global && account;
  });
  if (!allowed) throw new ApiError(429, 'TOO_MANY_ATTEMPTS');
  const result = await pool().query('SELECT id,username,password_hash,must_change_password,disabled FROM snaproom.admin_users WHERE username=$1', [username]);
  const admin = result.rows[0];
  if (!await verifyAdminPassword(body.password, admin?.password_hash) || admin?.disabled) throw new ApiError(401, 'INVALID_CREDENTIALS');
  const token = randomBytes(32).toString('hex');
  await transaction(async db => {
    const current = await db.query('SELECT id FROM snaproom.admin_users WHERE id=$1 AND password_hash=$2 AND NOT disabled FOR UPDATE', [admin.id, admin.password_hash]);
    if (!current.rowCount) throw new ApiError(401, 'INVALID_CREDENTIALS');
    await db.query("INSERT INTO snaproom.admin_sessions(token_hash,admin_id,expires_at) VALUES($1,$2,now()+interval '4 hours')", [hash(token), admin.id]);
    await audit(db, admin.id, 'login');
  });
  await setAdminCookie(request, token);
  return Response.json({ username: admin.username, mustChangePassword: admin.must_change_password });
}); }
export async function DELETE(request: Request) { return adminSafe(async () => {
  adminOrigin(request);
  const admin = await requireAdmin(true);
  await transaction(async db => { await db.query('DELETE FROM snaproom.admin_sessions WHERE token_hash=$1', [admin.tokenHash]); await audit(db, admin.id, 'logout'); });
  await setAdminCookie(request, '');
  return Response.json({ ok: true });
}); }
