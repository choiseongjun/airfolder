import { randomUUID } from 'node:crypto';
import { connection } from 'next/server';
import { ApiError, json, pool, safe, sameOrigin, transaction, uuid, viewer } from '@/lib/server';
import { wallPins } from '@/lib/wall';
export async function GET() { await connection(); return safe(async () => {
 const pins = await wallPins();
 return Response.json({ pins: pins.map(p => ({ id: p.id, src: `/api/photos/${p.photo_id}/content?wall=1`, name: p.name, x: p.x, y: p.y, rotation: p.rotation, rare: p.rare })) }, { headers: { 'Cache-Control': 'public, max-age=20' } });
});}
export async function POST(request: Request) { return safe(async () => {
 sameOrigin(request); const who = await viewer(), body = await json(request);
 if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 20) throw new ApiError(400, 'INVALID_SELECTION');
 const ids = [...new Set(body.ids.map(uuid))];
 const pinned = await transaction(async db => {
  const photos = await db.query(`SELECT p.id FROM snaproom.photos p WHERE snaproom.album_active(p.folder_id) AND p.id=ANY($1::uuid[]) AND p.owner_id=$2 AND p.shared AND cardinality(p.recipients)=0 FOR SHARE`, [ids, who]);
  if (photos.rowCount !== ids.length) throw new ApiError(403, 'PUBLIC_OWN_PHOTOS_REQUIRED');
  const rows: { rare: boolean }[] = [];
  for (const id of ids) {
   const x = Math.random() * 84 + 3, y = Math.random() * 84 + 3, rotation = Math.random() * 26 - 13, rare = Math.random() < 0.12;
   const inserted = await db.query(`INSERT INTO snaproom.wall_pins(id,photo_id,owner_id,x,y,rotation,rare) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(photo_id) DO NOTHING RETURNING rare`, [randomUUID(), id, who, x, y, rotation, rare]);
   if (inserted.rowCount) rows.push(inserted.rows[0]);
  }
  return rows;
 });
 return Response.json({ pinned: pinned.length, rare: pinned.some(p => p.rare) }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
});}
export async function DELETE(request: Request) { return safe(async () => {
 sameOrigin(request); const who = await viewer(), body = await json(request);
 await pool().query('DELETE FROM snaproom.wall_pins WHERE photo_id=$1 AND owner_id=$2', [uuid(body.photoId), who]);
 return Response.json({ ok: true });
});}
