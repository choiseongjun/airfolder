import { ApiError, pool, safe, storage, uuid, viewer } from '@/lib/server';
import { connection } from 'next/server';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  return safe(async () => {
    const who = await viewer(), id = uuid((await context.params).id);
    const rows = await pool().query(`SELECT p.object_path FROM snaproom.photos p JOIN snaproom.members m ON m.folder_id=p.folder_id
      WHERE p.id=$1 AND m.viewer_id=$2 AND (p.owner_id=$2 OR p.shared)`, [id, who]);
    if (!rows.rowCount) throw new ApiError(404, 'PHOTO_NOT_FOUND');
    const result = await storage().download(rows.rows[0].object_path);
    if (result.error || !result.data) throw new ApiError(503, 'PHOTO_UNAVAILABLE');
    return new Response(await result.data.arrayBuffer(), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  });
}
