import type { PoolClient } from 'pg';
import { ApiError, uuid } from './server';

export function parseRecipients(value: unknown, shared: boolean): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 200) throw new ApiError(400, 'INVALID_RECIPIENTS');
  const ids = [...new Set(value.map(uuid))];
  if (!shared && ids.length) throw new ApiError(400, 'INVALID_RECIPIENTS');
  return ids;
}
export async function checkRecipients(db: PoolClient, folders: string[], recipients: string[]) {
  for (const folder of new Set(folders)) {
    const members = await db.query('SELECT viewer_id FROM snaproom.members WHERE folder_id=$1 AND viewer_id=ANY($2::uuid[]) FOR SHARE', [folder, recipients]);
    if (members.rowCount !== recipients.length) throw new ApiError(400, 'RECIPIENT_NOT_MEMBER');
  }
}
