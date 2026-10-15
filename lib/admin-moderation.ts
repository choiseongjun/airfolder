import 'server-only';
import type { PoolClient } from 'pg';
import { ApiError } from './server';
import { audit } from './admin';

export const reportJoins = `FROM snaproom.safety_reports s
 LEFT JOIN snaproom.photos p ON p.id=s.photo_id
 LEFT JOIN snaproom.records r ON r.id=s.record_id
 LEFT JOIN snaproom.comments c ON c.id=s.comment_id
 LEFT JOIN snaproom.accounts a ON a.viewer_id=COALESCE(p.owner_id,r.owner_id,c.owner_id,s.target_user_id)`;
export const reportColumns = `s.id,s.reason,s.status,s.created_at,s.resolved_at,s.photo_id,s.record_id,s.comment_id,s.target_user_id,
 COALESCE(p.owner_id,r.owner_id,c.owner_id,s.target_user_id) AS author_id,
 COALESCE(a.display_name,'게스트') AS author_name,COALESCE(r.title,p.name,'') AS title,
 COALESCE(r.body,c.body,'') AS content,
 CASE WHEN s.photo_id IS NOT NULL THEN 'photo' WHEN s.record_id IS NOT NULL THEN 'record' WHEN s.comment_id IS NOT NULL THEN 'comment' ELSE 'user' END AS kind`;

export async function decideReport(db: PoolClient, adminId: string, id: string, action: string, note: string) {
  if (!['hide', 'dismiss', 'suspend', 'restore'].includes(action)) throw new ApiError(400, 'INVALID_ACTION');
  const result = await db.query(`SELECT ${reportColumns} ${reportJoins} WHERE s.id=$1 FOR UPDATE OF s`, [id]);
  const report = result.rows[0];
  if (!report) throw new ApiError(404, 'REPORT_NOT_FOUND');
  if (action === 'restore' ? report.status !== 'hidden' : report.status !== 'open') throw new ApiError(409, 'REPORT_ALREADY_REVIEWED');
  if (action === 'hide' || action === 'suspend' || action === 'restore') {
    const hidden = action !== 'restore';
    if (report.photo_id) await db.query('UPDATE snaproom.photos SET safety_hidden=$2,shared=false WHERE id=$1', [report.photo_id, hidden]);
    if (report.record_id) await db.query('UPDATE snaproom.records SET safety_hidden=$2,shared=false WHERE id=$1', [report.record_id, hidden]);
    if (report.comment_id) await db.query('UPDATE snaproom.comments SET hidden=$2 WHERE id=$1', [report.comment_id, hidden]);
  }
  if (action === 'suspend' || (action === 'hide' && report.target_user_id)) await db.query('UPDATE snaproom.viewers SET suspended_at=now() WHERE id=$1', [report.author_id]);
  // Restoring content does not automatically lift an account suspension or restore its old audience.
  const status = ['dismiss', 'restore'].includes(action) ? 'dismissed' : 'hidden';
  await db.query('UPDATE snaproom.safety_reports SET status=$2,resolved_at=now() WHERE id=$1', [id, status]);
  if (report.comment_id) await db.query('UPDATE snaproom.comment_reports SET status=$2 WHERE comment_id=$1', [report.comment_id, status]);
  await audit(db, adminId, 'report_' + action, id, note);
}

export async function reportMedia(db: Pick<PoolClient, 'query'>, reportId: string) {
  return db.query(`SELECT DISTINCT p.id,p.name,CASE WHEN p.mime LIKE 'video/%' THEN 'video' ELSE 'image' END AS media_kind,p.mime AS mime_type,p.object_path,p.preview_path,p.preview_status,p.preview_mime
    FROM snaproom.safety_reports s
    LEFT JOIN snaproom.comments c ON c.id=s.comment_id
    LEFT JOIN snaproom.record_photos rp ON rp.record_id=COALESCE(s.record_id,c.record_id)
    JOIN snaproom.photos p ON p.id=COALESCE(s.photo_id,c.photo_id,rp.photo_id)
    WHERE s.id=$1 ORDER BY p.id LIMIT 100`, [reportId]);
}
