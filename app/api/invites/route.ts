import { randomBytes } from 'node:crypto';
import { trackGrowth } from '@/lib/growth';
import { ApiError, hash, json, pool, safe, sameOrigin, uuid, viewer } from '@/lib/server';
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request); const who = await viewer(), body = await json(request), folder = uuid(body.folderId);
    const result = await pool().query('SELECT id FROM snaproom.folders WHERE id=$1 AND owner_id=$2 AND group_id IS NULL', [folder, who]);
    if (!result.rowCount) throw new ApiError(403, 'OWNER_REQUIRED');
    const token = randomBytes(32).toString('hex');
    await pool().query("INSERT INTO snaproom.invites(token_hash,folder_id,created_by,expires_at) VALUES($1,$2,$3,now()+interval '7 days')", [hash(token), folder, who]);
    trackGrowth({ event: 'invite_created', who, key: `invite_created:${hash(token)}`, contextId: folder, properties: { invite_type: 'album' } });
    return Response.json({ token, expiresInDays: 7 }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
