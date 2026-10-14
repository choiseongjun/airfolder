import { ApiError, hash, json, pool, safe, sameOrigin, sessionToken, viewer } from '@/lib/server';
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request); const who = await viewer(), body = await json(request);
    if (typeof body.token !== 'string' || !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(body.token) || !['ios','android'].includes(body.platform)) throw new ApiError(400,'INVALID_PUSH_TOKEN');
    const session = await sessionToken();
    if (!session) throw new ApiError(401,'SESSION_REQUIRED');
    await pool().query(`INSERT INTO snaproom.push_devices(token,viewer_id,session_hash,platform) VALUES($1,$2,$3,$4)
      ON CONFLICT(token) DO UPDATE SET viewer_id=$2,session_hash=$3,platform=$4,updated_at=now()`,[body.token,who,hash(session),body.platform]);
    return Response.json({ok:true});
  });
}
export async function DELETE(request: Request) {
  return safe(async () => {
    sameOrigin(request); const who = await viewer(), session = await sessionToken();
    await pool().query('DELETE FROM snaproom.push_devices WHERE viewer_id=$1 AND session_hash=$2',[who,hash(session!)]);
    return Response.json({ok:true});
  });
}
