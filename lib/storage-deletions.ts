import { pool, storage } from './server';

export async function cleanupDeletedStorage() {
  const result = await pool().query('SELECT object_path FROM snaproom.storage_deletions ORDER BY created_at LIMIT 100');
  const paths = result.rows.map(row => row.object_path as string);
  if (!paths.length) return;
  const removed = await storage().remove(paths);
  if (removed.error) throw new Error('STORAGE_DELETE_FAILED');
  await pool().query('DELETE FROM snaproom.storage_deletions WHERE object_path=ANY($1::text[])', [paths]);
}
