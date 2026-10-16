import { ApiError } from './server';
import type { PoolClient } from 'pg';

export async function deleteAlbum(db: PoolClient, id: string, who: string, name: unknown) {
  const result = await db.query('SELECT name,owner_id FROM snaproom.folders WHERE id=$1 FOR UPDATE', [id]);
  if (!result.rowCount) throw new ApiError(404, 'FOLDER_NOT_FOUND');
  if (result.rows[0].owner_id !== who) throw new ApiError(403, 'OWNER_REQUIRED');
  if (name !== result.rows[0].name) throw new ApiError(400, 'ALBUM_NAME_REQUIRED');
  // Row locks serialize against preview generation and metadata updates.
  const files = await db.query('SELECT object_path,preview_path FROM snaproom.photos WHERE folder_id=$1 FOR UPDATE', [id]);
  const paths = [...new Set<string>(files.rows.flatMap(p => [p.object_path,p.preview_path].filter(Boolean)))];
  if (paths.length) await db.query('INSERT INTO snaproom.storage_deletions(object_path) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING', [paths]);
  // Foreign keys remove photos, records, comments, reactions, invites and staged uploads.
  await db.query('DELETE FROM snaproom.folders WHERE id=$1 AND owner_id=$2', [id,who]);
}
