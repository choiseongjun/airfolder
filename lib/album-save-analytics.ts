import 'server-only';
import { after } from 'next/server';
import { pool } from './server';
import { trackGrowth } from './growth';
import { growthProperties } from './growth-events';
import { memoryTemplate, type MemoryTemplate } from './memory-templates';

// Record completion only after the saved record actually contains persisted photos.
export function trackAlbumSaved(who: string, recordId: string, folderId: string, raw: unknown) {
  if (!raw || typeof raw !== 'object') return;
  const properties = growthProperties(raw as Record<string, unknown>);
  const template: MemoryTemplate | undefined = memoryTemplate(String(properties.template_id || ''));
  if (!properties.attempt_id || !template?.albumTheme) return;
  after(async () => {
    try {
      const result = await pool().query(`SELECT f.theme,count(p.id)::int photo_count,
        EXISTS(SELECT 1 FROM snaproom.accounts a WHERE a.viewer_id=$3) AS member
        FROM snaproom.records r JOIN snaproom.folders f ON f.id=r.folder_id
        JOIN snaproom.record_photos rp ON rp.record_id=r.id
        JOIN snaproom.photos p ON p.id=rp.photo_id AND p.deleted_at IS NULL
        WHERE r.id=$1 AND r.folder_id=$2 AND r.owner_id=$3 AND r.deleted_at IS NULL
        GROUP BY f.theme`, [recordId, folderId, who]);
      const row = result.rows[0];
      if (!row || row.theme !== template.albumTheme || row.photo_count < 1) return;
      trackGrowth({ event: 'album_save_completed', who, key: `maker-saved:${recordId}`, contextId: folderId,
        properties: { attempt_id: properties.attempt_id, template_id: template.id, photo_count: row.photo_count, creator_type: row.member ? 'member' : 'guest' } });
    } catch { console.error('Album completion analytics unavailable'); }
  });
}
