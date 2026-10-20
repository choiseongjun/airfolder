import 'server-only';
import { pool } from './server';
export async function wallPins(limit = 150) {
 const result = await pool().query(`SELECT w.id,w.photo_id,w.x,w.y,w.rotation,w.rare,p.name,p.mime
 FROM snaproom.wall_pins w JOIN snaproom.photos p ON p.id=w.photo_id AND p.deleted_at IS NULL
 WHERE p.shared AND cardinality(p.recipients)=0 AND snaproom.album_active(p.folder_id)
 ORDER BY w.pinned_at DESC LIMIT $1`, [limit]);
 return result.rows as { id: string; photo_id: string; x: number; y: number; rotation: number; rare: boolean; name: string; mime: string }[];
}
