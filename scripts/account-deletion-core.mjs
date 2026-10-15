// Only processes a previously confirmed request. Dependencies are injected for verification.
export async function deleteRequestedAccount(db, store, auth, viewerId) {
  const key = `account-deletion:${viewerId}`;
  const lock = await db.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [key]);
  if (!lock.rows[0].locked) return false;
  try {
    await db.query('BEGIN');
    try {
      const result = await db.query(`SELECT v.id,a.firebase_uid FROM snaproom.viewers v LEFT JOIN snaproom.accounts a ON a.viewer_id=v.id WHERE v.id=$1 AND v.deletion_requested_at<now()-interval '5 minutes' FOR UPDATE OF v`, [viewerId]);
      if (!result.rowCount) { await db.query('ROLLBACK'); return false; }
      const job = result.rows[0];
      const groups = await db.query('SELECT id FROM snaproom.groups WHERE owner_id=$1 FOR UPDATE', [job.id]);
      for (const group of groups.rows) {
        const next = await db.query('SELECT m.viewer_id FROM snaproom.group_members m JOIN snaproom.viewers v ON v.id=m.viewer_id WHERE m.group_id=$1 AND m.viewer_id<>$2 AND v.deletion_requested_at IS NULL AND v.suspended_at IS NULL ORDER BY m.joined_at,m.viewer_id LIMIT 1', [group.id, job.id]);
        if (next.rowCount) await db.query('UPDATE snaproom.groups SET owner_id=$2 WHERE id=$1', [group.id, next.rows[0].viewer_id]);
        else await db.query('DELETE FROM snaproom.groups WHERE id=$1', [group.id]);
      }
      await db.query('UPDATE snaproom.folders f SET owner_id=g.owner_id FROM snaproom.groups g WHERE f.group_id=g.id AND f.owner_id=$1', [job.id]);
      const files = await db.query('SELECT object_path,preview_path FROM snaproom.photos WHERE owner_id=$1 OR folder_id IN (SELECT id FROM snaproom.folders WHERE owner_id=$1)', [job.id]);
      const paths = [...new Set(files.rows.flatMap(p => [p.object_path, p.preview_path].filter(Boolean)))];
      for (let i = 0; i < paths.length; i += 100) {
        const removed = await store.remove(paths.slice(i, i + 100));
        if (removed.error) throw new Error('Storage cleanup failed; request retained for retry');
      }
      if (job.firebase_uid) {
        if (!auth) throw new Error('Firebase administration credentials required');
        await auth.deleteUser(job.firebase_uid).catch(error => { if (error.code !== 'auth/user-not-found') throw error; });
      }
      // Empty selected-member lists mean everyone: keep such content private when the last recipient is removed.
      for (const table of ['photos', 'records']) await db.query(`UPDATE snaproom.${table} SET shared=CASE WHEN cardinality(recipients)=1 THEN false ELSE shared END,recipients=array_remove(recipients,$1::uuid) WHERE $1::uuid=ANY(recipients)`, [job.id]);
      await db.query('DELETE FROM snaproom.photos WHERE owner_id=$1', [job.id]);
      await db.query('DELETE FROM snaproom.invites WHERE created_by=$1', [job.id]);
      await db.query('DELETE FROM snaproom.folders WHERE owner_id=$1', [job.id]);
      await db.query('DELETE FROM snaproom.accounts WHERE viewer_id=$1', [job.id]);
      await db.query('UPDATE snaproom.deletion_receipts SET completed_at=now() WHERE viewer_id=$1', [job.id]);
      await db.query('DELETE FROM snaproom.viewers WHERE id=$1', [job.id]);
      await db.query('COMMIT');
      return true;
    } catch (error) { await db.query('ROLLBACK'); throw error; }
  } finally { await db.query('SELECT pg_advisory_unlock(hashtext($1))', [key]); }
}
