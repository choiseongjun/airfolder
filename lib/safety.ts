import 'server-only';
import type { PoolClient } from 'pg';
import { ApiError, pool, uuid } from './server';
import { targetAccess } from './memories';
import { TERMS_VERSION } from './policy';

export async function requireActiveViewer(who: string) {
  const result = await pool().query('SELECT suspended_at FROM snaproom.viewers WHERE id=$1', [who]);
  if (result.rows[0]?.suspended_at) throw new ApiError(403, 'ACCOUNT_SUSPENDED');
}

export async function requireTerms(who: string) {
  const result = await pool().query('SELECT terms_version,suspended_at FROM snaproom.viewers WHERE id=$1', [who]);
  if (result.rows[0]?.suspended_at) throw new ApiError(403, 'ACCOUNT_SUSPENDED');
  if (result.rows[0]?.terms_version !== TERMS_VERSION) throw new ApiError(403, 'TERMS_REQUIRED');
}

export async function safetyTarget(db: PoolClient, who: string, kind: unknown, value: unknown) {
  const id = uuid(value);
  if (kind === 'user') {
    const result = await db.query(`SELECT 1 FROM snaproom.viewers v WHERE v.id=$1 AND (EXISTS(SELECT 1 FROM snaproom.members a JOIN snaproom.members b ON b.folder_id=a.folder_id WHERE a.viewer_id=$1 AND b.viewer_id=$2) OR EXISTS(SELECT 1 FROM snaproom.group_members a JOIN snaproom.group_members b ON b.group_id=a.group_id WHERE a.viewer_id=$1 AND b.viewer_id=$2))`, [id, who]);
    if (!result.rowCount) throw new ApiError(404, 'NOT_FOUND');
    return { id, owner: id, column: 'target_user_id' };
  }
  if (kind === 'comment') {
    const result = await db.query('SELECT * FROM snaproom.comments WHERE id=$1 AND NOT hidden', [id]);
    const comment = result.rows[0];
    if (!comment) throw new ApiError(404, 'NOT_FOUND');
    await targetAccess(db, who, comment.photo_id ? 'photo' : 'record', comment.photo_id || comment.record_id);
    const allowed = await db.query('SELECT snaproom.interaction_allowed($1,$2) AS allowed', [comment.owner_id, who]);
    if (!allowed.rows[0].allowed) throw new ApiError(404, 'NOT_FOUND');
    return { id, owner: comment.owner_id as string, column: 'comment_id' };
  }
  const target = await targetAccess(db, who, kind, id);
  return { id, owner: target.owner_id as string, column: target.column };
}
