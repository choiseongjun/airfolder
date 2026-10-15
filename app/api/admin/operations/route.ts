import { ApiError, pool } from '@/lib/server';
import { adminSafe, requireAdmin } from '@/lib/admin';

export async function GET(request: Request) { return adminSafe(async () => {
  await requireAdmin();
  const params = new URL(request.url).searchParams, view = params.get('view');
  const offset = Math.floor(Math.min(100000, Math.max(0, Number(params.get('offset')) || 0)));
  let sql;
  if (view === 'deletions') sql = `SELECT v.id,COALESCE(a.display_name,'게스트') AS name,COALESCE(a.provider,'guest') AS provider,v.deletion_requested_at AS requested_at,v.deletion_requested_at+interval '30 days' AS due_at,v.deletion_requested_at<now()-interval '5 minutes' AS ready,v.deletion_attempts AS attempts,v.deletion_last_attempt_at AS last_attempt_at,v.deletion_last_error AS error FROM snaproom.viewers v LEFT JOIN snaproom.accounts a ON a.viewer_id=v.id WHERE v.deletion_requested_at IS NOT NULL ORDER BY v.deletion_requested_at,v.id`;
  else if (view === 'suspended') sql = `SELECT v.id,COALESCE(a.display_name,'게스트') AS name,v.suspended_at FROM snaproom.viewers v LEFT JOIN snaproom.accounts a ON a.viewer_id=v.id WHERE v.suspended_at IS NOT NULL AND v.deletion_requested_at IS NULL ORDER BY v.suspended_at DESC,v.id`;
  else if (view === 'audit') sql = `SELECT e.id,e.action,e.subject_id,e.note,e.created_at,COALESCE(a.username,'자동 처리') AS actor FROM snaproom.admin_audit e LEFT JOIN snaproom.admin_users a ON a.id=e.admin_id WHERE e.created_at>=now()-interval '30 days' ORDER BY e.created_at DESC,e.id`;
  else throw new ApiError(400, 'INVALID_VIEW');
  const result = await pool().query(sql + ' LIMIT 51 OFFSET $1', [offset]);
  return Response.json({ items: result.rows.slice(0, 50), hasMore: result.rows.length > 50 });
}); }
