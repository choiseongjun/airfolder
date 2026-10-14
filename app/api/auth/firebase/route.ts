import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { ApiError, hash, json, safe, sameOrigin, transaction, viewer } from '@/lib/server';
import { firebaseAdminAuth } from '@/lib/firebase-server';
import { attachIdentity, identityFromVerifiedClaims } from '@/lib/auth-core';

export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const guest = await viewer(), input = await json(request);
    if (typeof input.idToken !== 'string' || input.idToken.length < 100 || input.idToken.length > 16384) throw new ApiError(400,'INVALID_TOKEN');
    let auth;
    try { auth = firebaseAdminAuth(); } catch { throw new ApiError(503,'AUTH_NOT_CONFIGURED'); }
    let identity;
    try { identity = identityFromVerifiedClaims(await auth.verifyIdToken(input.idToken)); }
    catch { throw new ApiError(401,'INVALID_TOKEN'); }
    const token = randomBytes(32).toString('hex');
    const oldToken = (await cookies()).get('snaproom_session')?.value;
    const viewerId = await transaction(async db => {
      let owner;
      try { owner = await attachIdentity(db,guest,identity); }
      catch(error) { if(error instanceof Error && ['LOGOUT_FIRST','SESSION_CHANGED'].includes(error.message)) throw new ApiError(409,error.message); throw error; }
      if(oldToken) await db.query('DELETE FROM snaproom.sessions WHERE token_hash=$1',[hash(oldToken)]);
      await db.query("INSERT INTO snaproom.sessions(token_hash,viewer_id,expires_at) VALUES($1,$2,now()+interval '30 days')",[hash(token),owner]);
      return owner;
    });
    (await cookies()).set('snaproom_session',token,{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/',maxAge:2592000});
    return Response.json({viewerId},{headers:{'Cache-Control':'no-store'}});
  });
}
