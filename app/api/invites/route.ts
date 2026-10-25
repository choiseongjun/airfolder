import { randomBytes } from 'node:crypto';
import { trackGrowth } from '@/lib/growth';
import { requireTerms } from '@/lib/safety';
import { ApiError, hash, json, pool, safe, sameOrigin, uuid, viewer } from '@/lib/server';
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request); const who = await viewer(), body = await json(request), folder = uuid(body.folderId);
    const result = await pool().query(`SELECT f.id,f.group_id FROM snaproom.folders f LEFT JOIN snaproom.groups g ON g.id=f.group_id
      WHERE f.id=$1 AND COALESCE(g.owner_id,f.owner_id)=$2 AND f.deleted_at IS NULL`, [folder, who]);
    if (!result.rowCount) throw new ApiError(403, 'OWNER_REQUIRED');
    const groupId = result.rows[0].group_id;
    if (groupId) await requireTerms(who);
    const token = randomBytes(32).toString('hex');
    if (groupId) {
      await pool().query("INSERT INTO snaproom.group_invites(token_hash,group_id,expires_at) VALUES($1,$2,now()+interval '7 days')", [hash(token), groupId]);
      trackGrowth({ event: 'invite_created', who, key: `invite_created:${hash(token)}`, contextId: groupId, properties: { invite_type: 'group' } });
      return Response.json({ token, kind: 'group', groupId, expiresInDays: 7 }, { headers: { 'Cache-Control': 'no-store' } });
    }
    await pool().query("INSERT INTO snaproom.invites(token_hash,folder_id,created_by,expires_at) VALUES($1,$2,$3,now()+interval '7 days')", [hash(token), folder, who]);
    trackGrowth({ event: 'invite_created', who, key: `invite_created:${hash(token)}`, contextId: folder, properties: { invite_type: 'album',
      ...(body.flow === 'photo_request' ? { flow: 'photo_request', attempt_id: body.attempt_id } : {}) } });
    return Response.json({ token, kind: 'album', expiresInDays: 7 }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
