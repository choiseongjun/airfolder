import { ApiError, hash, json, safe, sameOrigin, transaction, viewer } from '@/lib/server';
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request); const who = await viewer(), body = await json(request);
    if (typeof body.token !== 'string' || !/^[a-f\d]{64}$/.test(body.token)) throw new ApiError(400, 'INVALID_INVITE');
    const folderId = await transaction(async db => {
      const invite = await db.query('SELECT folder_id FROM snaproom.invites WHERE token_hash=$1 AND expires_at>now()', [hash(body.token)]);
      if (!invite.rowCount) throw new ApiError(404, 'INVITE_EXPIRED');
      const id = invite.rows[0].folder_id;
      await db.query('INSERT INTO snaproom.members(folder_id,viewer_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, who]);
      return id;
    });
    return Response.json({ folderId });
  });
}
