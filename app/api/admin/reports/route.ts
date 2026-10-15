import { ApiError, json, pool, transaction, uuid } from '@/lib/server';
import { adminOrigin, adminSafe, requireAdmin } from '@/lib/admin';
import { decideReport, reportColumns, reportJoins, reportMedia } from '@/lib/admin-moderation';

export async function GET(request: Request) { return adminSafe(async () => {
  await requireAdmin();
  const params = new URL(request.url).searchParams;
  if (params.has('id')) {
    const id = uuid(params.get('id'));
    const result = await pool().query(`SELECT ${reportColumns} ${reportJoins} WHERE s.id=$1`, [id]);
    if (!result.rowCount) throw new ApiError(404, 'REPORT_NOT_FOUND');
    const media = await reportMedia(pool(), id);
    return Response.json({ report: result.rows[0], media: media.rows.map(p => ({ id: p.id, name: p.name, kind: p.media_kind, url: `/api/admin/media?report=${id}&photo=${p.id}` })) });
  }
  const status = params.get('status') || 'open';
  if (!['open', 'hidden', 'dismissed'].includes(status)) throw new ApiError(400, 'INVALID_STATUS');
  const offset = Math.min(100000, Math.max(0, Number(params.get('offset')) || 0));
  const result = await pool().query(`SELECT s.id,s.status,s.created_at,LEFT(s.reason,160) AS reason,COALESCE(a.display_name,'게스트') AS author_name,CASE WHEN s.photo_id IS NOT NULL THEN 'photo' WHEN s.record_id IS NOT NULL THEN 'record' WHEN s.comment_id IS NOT NULL THEN 'comment' ELSE 'user' END AS kind ${reportJoins} WHERE s.status=$1 ORDER BY s.created_at,s.id LIMIT 51 OFFSET $2`, [status, Math.floor(offset)]);
  return Response.json({ items: result.rows.slice(0, 50), hasMore: result.rows.length > 50 });
}); }
export async function POST(request: Request) { return adminSafe(async () => {
  adminOrigin(request);
  const admin = await requireAdmin(), body = await json(request), id = uuid(body.id);
  if (typeof body.note !== 'string' || !body.note.trim() || body.note.length > 1000 || typeof body.action !== 'string') throw new ApiError(400, 'REVIEW_NOTE_REQUIRED');
  await transaction(db => decideReport(db, admin.id, id, body.action, body.note.trim()));
  return Response.json({ ok: true });
}); }
