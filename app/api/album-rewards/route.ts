import { connection } from 'next/server';
import { ApiError, json, pool, safe, sameOrigin, transaction, uuid, viewer } from '@/lib/server';
import { requireTerms } from '@/lib/safety';
import { albumRewards, allowedAlbumDecoration } from '@/lib/album-rewards';

export async function GET(request: Request) {
  await connection();
  return safe(async () => {
    const who = await viewer(), folder = uuid(new URL(request.url).searchParams.get('folderId'));
    return Response.json(await albumRewards(pool(), who, folder), { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
export async function PUT(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const who = await viewer(), body = await json(request), folder = uuid(body.folderId);
    await requireTerms(who);
    return transaction(async db => {
      const owner = await db.query('SELECT id FROM snaproom.folders WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL FOR UPDATE', [folder, who]);
      if (!owner.rowCount) throw new ApiError(403, 'OWNER_REQUIRED');
      const decoration = await allowedAlbumDecoration(db, who, folder, body.decoration);
      if (decoration?.phrase) delete decoration.phrase;
      await db.query('UPDATE snaproom.folders SET reward_cover=$2,updated_at=now() WHERE id=$1', [folder, decoration ? JSON.stringify(decoration) : null]);
      return Response.json({ cover: decoration });
    });
  });
}
