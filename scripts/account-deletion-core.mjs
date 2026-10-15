// Only processes a previously confirmed request. Dependencies are injected for verification.
export function deletionErrorCode(error) {
  return ['FIREBASE_ADMIN_NOT_CONFIGURED', 'STORAGE_DELETE_FAILED', 'FIREBASE_DELETE_FAILED'].includes(error?.code) ? error.code : 'DELETION_RETRY_REQUIRED';
}
/** @param {{ adminId?: string | null }} options */
export async function deleteRequestedAccount(db, store, auth, viewerId, options = {}) {
  const key = `account-deletion:${viewerId}`;
  const lock = await db.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [key]);
  if (!lock.rows[0].locked) return false;
  const log = (action, note = '') => db.query('INSERT INTO snaproom.admin_audit(admin_id,action,subject_id,note) VALUES($1,$2,$3,$4)', [options.adminId ?? null, action, viewerId, note]);
  let attempted = false;
  try {
    const attempt = await db.query("UPDATE snaproom.viewers SET deletion_attempts=deletion_attempts+1,deletion_last_attempt_at=now(),deletion_last_error=NULL WHERE id=$1 AND deletion_requested_at<now()-interval '5 minutes' RETURNING deletion_attempts", [viewerId]);
    if (!attempt.rowCount) return false;
    attempted = true;
    await log(attempt.rows[0].deletion_attempts > 1 ? 'deletion_retried' : 'deletion_started', `${attempt.rows[0].deletion_attempts}회차`);
    await db.query('BEGIN');
    try {
      const result = await db.query(`SELECT v.id,a.firebase_uid FROM snaproom.viewers v LEFT JOIN snaproom.accounts a ON a.viewer_id=v.id WHERE v.id=$1 AND v.deletion_requested_at<now()-interval '5 minutes' FOR UPDATE OF v`, [viewerId]);
      if (!result.rowCount) { await db.query('ROLLBACK'); return false; }
      const job = result.rows[0];
      if (job.firebase_uid && !auth) throw Object.assign(new Error('Firebase administration credentials required'), { code: 'FIREBASE_ADMIN_NOT_CONFIGURED' });
      const groups = await db.query('SELECT id FROM snaproom.groups WHERE owner_id=$1 FOR UPDATE', [job.id]);
      for (const group of groups.rows) {
        const next = await db.query('SELECT m.viewer_id FROM snaproom.group_members m JOIN snaproom.viewers v ON v.id=m.viewer_id WHERE m.group_id=$1 AND m.viewer_id<>$2 AND v.deletion_requested_at IS NULL AND v.suspended_at IS NULL ORDER BY m.joined_at,m.viewer_id LIMIT 1', [group.id, job.id]);
        if (next.rowCount) await db.query('UPDATE snaproom.groups SET owner_id=$2 WHERE id=$1', [group.id, next.rows[0].viewer_id]);
        else await db.query('DELETE FROM snaproom.groups WHERE id=$1', [group.id]);
      }
      await db.query('UPDATE snaproom.folders f SET owner_id=g.owner_id FROM snaproom.groups g WHERE f.group_id=g.id AND f.owner_id=$1', [job.id]);
      // Older shared albums may have members but no group. Preserve surviving members' work too.
      const folders = await db.query('SELECT id FROM snaproom.folders WHERE owner_id=$1 FOR UPDATE', [job.id]);
      for (const folder of folders.rows) {
        const next = await db.query('SELECT m.viewer_id FROM snaproom.members m JOIN snaproom.viewers v ON v.id=m.viewer_id WHERE m.folder_id=$1 AND m.viewer_id<>$2 AND v.deletion_requested_at IS NULL AND v.suspended_at IS NULL ORDER BY m.viewer_id LIMIT 1', [folder.id, job.id]);
        if (next.rowCount) await db.query('UPDATE snaproom.folders SET owner_id=$2 WHERE id=$1', [folder.id, next.rows[0].viewer_id]);
      }
      const files = await db.query('SELECT object_path,preview_path FROM snaproom.photos WHERE owner_id=$1 OR folder_id IN (SELECT id FROM snaproom.folders WHERE owner_id=$1)', [job.id]);
      const paths = [...new Set(files.rows.flatMap(p => [p.object_path, p.preview_path].filter(Boolean)))];
      for (let i = 0; i < paths.length; i += 100) {
        const removed = await store.remove(paths.slice(i, i + 100));
        if (removed.error) throw Object.assign(new Error('Storage cleanup failed; request retained for retry'), { code: 'STORAGE_DELETE_FAILED' });
      }
      if (job.firebase_uid) {
        await auth.deleteUser(job.firebase_uid).catch(error => { if (error.code !== 'auth/user-not-found') throw Object.assign(new Error('Firebase deletion failed; request retained for retry'), { code: 'FIREBASE_DELETE_FAILED' }); });
      }
      // Empty selected-member lists mean everyone: keep such content private when the last recipient is removed.
      for (const table of ['photos', 'records']) await db.query(`UPDATE snaproom.${table} SET shared=CASE WHEN cardinality(recipients)=1 THEN false ELSE shared END,recipients=array_remove(recipients,$1::uuid) WHERE $1::uuid=ANY(recipients)`, [job.id]);
      await db.query('DELETE FROM snaproom.photos WHERE owner_id=$1', [job.id]);
      await db.query('DELETE FROM snaproom.invites WHERE created_by=$1', [job.id]);
      await db.query('DELETE FROM snaproom.folders WHERE owner_id=$1', [job.id]);
      await db.query('DELETE FROM snaproom.accounts WHERE viewer_id=$1', [job.id]);
      await db.query('UPDATE snaproom.deletion_receipts SET completed_at=now() WHERE viewer_id=$1', [job.id]);
      await db.query('DELETE FROM snaproom.viewers WHERE id=$1', [job.id]);
      // The completion log commits with the deleted data, so a crash cannot lose this record.
      await log('deletion_completed');
      await db.query('COMMIT');
      return true;
    } catch (error) { await db.query('ROLLBACK'); throw error; }
  } catch (error) {
    if (attempted) {
      const code = deletionErrorCode(error);
      await db.query('UPDATE snaproom.viewers SET deletion_last_error=$2 WHERE id=$1', [viewerId, code]);
      await log('deletion_failed', code);
    }
    throw error;
  } finally { await db.query('SELECT pg_advisory_unlock(hashtext($1))', [key]); }
}
