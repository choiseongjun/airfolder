import { ApiError, json, transaction } from '@/lib/server';
import { adminOrigin, adminSafe, audit, limitAdminAttempts, requireAdmin, setAdminCookie } from '@/lib/admin';
import { hashAdminPassword, validAdminPassword, verifyAdminPassword } from '@/scripts/admin-password.mjs';

export async function POST(request: Request) { return adminSafe(async () => {
  adminOrigin(request);
  const admin = await requireAdmin(true), body = await json(request);
  if (!validAdminPassword(body.password) || typeof body.currentPassword !== 'string' || body.currentPassword === body.password) throw new ApiError(400, 'PASSWORD_REQUIREMENTS');
  const allowed = await transaction(db => limitAdminAttempts(db, 'password:' + admin.id, 10));
  if (!allowed) throw new ApiError(429, 'TOO_MANY_ATTEMPTS');
  const encoded = await hashAdminPassword(body.password);
  await transaction(async db => {
    const result = await db.query('SELECT password_hash FROM snaproom.admin_users WHERE id=$1 AND NOT disabled FOR UPDATE', [admin.id]);
    if (!result.rowCount || !await verifyAdminPassword(body.currentPassword, result.rows[0].password_hash)) throw new ApiError(401, 'INVALID_CREDENTIALS');
    await db.query('UPDATE snaproom.admin_users SET password_hash=$2,must_change_password=false,password_changed_at=now() WHERE id=$1', [admin.id, encoded]);
    await db.query('DELETE FROM snaproom.admin_sessions WHERE admin_id=$1', [admin.id]);
    await audit(db, admin.id, 'password_changed');
  });
  await setAdminCookie(request, '');
  return Response.json({ ok: true, loginRequired: true });
}); }
