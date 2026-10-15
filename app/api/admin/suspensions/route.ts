import { ApiError, json, transaction, uuid } from '@/lib/server';
import { adminOrigin, adminSafe, audit, requireAdmin } from '@/lib/admin';

export async function POST(request: Request) { return adminSafe(async () => {
  adminOrigin(request);
  const admin = await requireAdmin(), body = await json(request), id = uuid(body.id);
  if (body.action !== 'unsuspend' || typeof body.note !== 'string' || !body.note.trim() || body.note.length > 1000) throw new ApiError(400, 'REVIEW_NOTE_REQUIRED');
  await transaction(async db => {
    const result = await db.query('UPDATE snaproom.viewers SET suspended_at=NULL WHERE id=$1 AND suspended_at IS NOT NULL AND deletion_requested_at IS NULL RETURNING id', [id]);
    if (!result.rowCount) throw new ApiError(409, 'ACCOUNT_NOT_SUSPENDED');
    await audit(db, admin.id, 'account_unsuspended', id, body.note.trim());
  });
  return Response.json({ ok: true });
}); }
