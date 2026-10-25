import { pool } from './server';

export async function cleanupCharacterDrafts() {
  // Never touch the applied image, daily quota, or a generation still holding its lease.
  const result = await pool().query(`UPDATE snaproom.character_profiles SET draft=NULL,draft_at=NULL
    WHERE (draft IS NOT NULL OR draft_at IS NOT NULL)
      AND (draft_at IS NULL OR draft_at<=now()-interval '24 hours')
      AND (busy_until IS NULL OR busy_until<=now())`);
  return result.rowCount || 0;
}
