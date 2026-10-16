import { pool, storage, transaction } from './server';
import { purgeExpiredAlbum } from './album-deletion';

export async function cleanupDeletedStorage() {
  const expired=await pool().query("SELECT id FROM snaproom.folders WHERE deleted_at<=now()-interval '30 days' ORDER BY deleted_at LIMIT 20");
  for(const row of expired.rows)await transaction(db=>purgeExpiredAlbum(db,row.id));
  const result = await pool().query('SELECT object_path FROM snaproom.storage_deletions ORDER BY created_at LIMIT 100');
  const paths = result.rows.map(row => row.object_path as string);
  if (!paths.length) return;
  const removed = await storage().remove(paths);
  if (removed.error) throw new Error('STORAGE_DELETE_FAILED');
  await pool().query('DELETE FROM snaproom.storage_deletions WHERE object_path=ANY($1::text[])', [paths]);
}
