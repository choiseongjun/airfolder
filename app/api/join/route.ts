import { ApiError, hash, json, pool, safe, sameOrigin, transaction, viewer } from '@/lib/server';
import { requireTerms } from '@/lib/safety';
import { trackGrowth } from '@/lib/growth';
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request); const who = await viewer(), body = await json(request);
    await requireTerms(who);
    if (typeof body.token !== 'string' || !/^[a-f\d]{64}$/.test(body.token)) throw new ApiError(400, 'INVALID_INVITE');
    const joined = await transaction(async db => {
      const groupInvite=await db.query('SELECT g.id FROM snaproom.groups g JOIN snaproom.group_invites i ON i.group_id=g.id WHERE i.token_hash=$1 AND i.expires_at>now() FOR UPDATE OF g',[hash(body.token)]);
      if(groupInvite.rowCount){const groupId=groupInvite.rows[0].id;const valid=await db.query('SELECT 1 FROM snaproom.group_invites WHERE token_hash=$1 AND expires_at>now()',[hash(body.token)]);if(!valid.rowCount)throw new ApiError(404,'INVITE_EXPIRED');const capacity=await db.query('SELECT count(*)::int n,COALESCE(bool_or(viewer_id=$2),false) joined FROM snaproom.group_members WHERE group_id=$1',[groupId,who]);if(capacity.rows[0].n>=200&&!capacity.rows[0].joined)throw new ApiError(409,'GROUP_MEMBER_LIMIT');await db.query('INSERT INTO snaproom.group_members(group_id,viewer_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[groupId,who]);return {groupId};}
      const invite = await db.query('SELECT i.folder_id FROM snaproom.invites i JOIN snaproom.folders f ON f.id=i.folder_id WHERE i.token_hash=$1 AND i.expires_at>now() AND f.group_id IS NULL FOR UPDATE OF f', [hash(body.token)]);
      if (!invite.rowCount) throw new ApiError(404, 'INVITE_EXPIRED');
      const id = invite.rows[0].folder_id;
      await db.query('INSERT INTO snaproom.members(folder_id,viewer_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, who]);
      return {folderId:id};
    });
    const contextId = joined.groupId || joined.folderId;
    const albums = await pool().query(`SELECT f.id,f.name FROM snaproom.folders f
      JOIN snaproom.members m ON m.folder_id=f.id AND m.viewer_id=$1
      WHERE ${joined.groupId ? 'f.group_id=$2' : 'f.id=$2'} ORDER BY f.created_at DESC`, [who, contextId]);
    const owner = await pool().query(`SELECT owner_id FROM snaproom.${joined.groupId ? 'groups' : 'folders'} WHERE id=$1`, [contextId]);
    if (owner.rows[0]?.owner_id !== who) trackGrowth({ event: 'invite_joined', who, contextId,
      key: `invite_joined:${who}:${contextId}:${new Date().toISOString().slice(0,10)}`,
      properties: { source: 'guest', invite_type: joined.groupId ? 'group' : 'album' } });
    return Response.json({ ...joined, albums: albums.rows }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
