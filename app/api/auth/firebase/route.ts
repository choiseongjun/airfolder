import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { ApiError, hash, json, safe, sameOrigin, transaction, viewer } from '@/lib/server';
import { firebaseAdminAuth } from '@/lib/firebase-server';
import { attachIdentity, identityFromVerifiedClaims } from '@/lib/auth-core';
import { trackGrowth } from '@/lib/growth';

export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const guest = await viewer(), input = await json(request);
    if (typeof input.idToken !== 'string' || input.idToken.length < 100 || input.idToken.length > 16384) throw new ApiError(400,'INVALID_TOKEN');
    let auth;
    try { auth = firebaseAdminAuth(); } catch { throw new ApiError(503,'AUTH_NOT_CONFIGURED'); }
    let identity;
    try {
      const claims = await auth.verifyIdToken(input.idToken);
      identity = identityFromVerifiedClaims(claims, undefined, true);
    }
    catch { throw new ApiError(401,'INVALID_TOKEN'); }
    const token = randomBytes(32).toString('hex');
    const oldToken = (await cookies()).get('snaproom_session')?.value;
    let isNewAccount = false;
    const viewerId = await transaction(async db => {
      // Password sign-in is limited to accounts explicitly provisioned by the operator.
      // Firebase UID, never an unverified email claim, selects the existing account.
      if (identity.provider === 'password') {
        const provisioned = await db.query("SELECT 1 FROM snaproom.accounts WHERE firebase_uid=$1 AND provider='password'", [identity.uid]);
        if (!provisioned.rowCount) throw new ApiError(403, 'ACCOUNT_NOT_PROVISIONED');
      }
      const deleting=await db.query('SELECT 1 FROM snaproom.accounts a JOIN snaproom.viewers v ON v.id=a.viewer_id WHERE a.firebase_uid=$1 AND v.deletion_requested_at IS NOT NULL',[identity.uid]);
      if(deleting.rowCount)throw new ApiError(409,'ACCOUNT_DELETION_PENDING');
      let owner;
      try { owner = await attachIdentity(db,guest,identity,() => { isNewAccount = true; }); }
      catch(error) { if(error instanceof Error && ['LOGOUT_FIRST','SESSION_CHANGED'].includes(error.message)) throw new ApiError(409,error.message); throw error; }
      if(oldToken) await db.query('DELETE FROM snaproom.sessions WHERE token_hash=$1',[hash(oldToken)]);
      await db.query("INSERT INTO snaproom.sessions(token_hash,viewer_id,expires_at) VALUES($1,$2,now()+interval '30 days')",[hash(token),owner]);
      return owner;
    });
    (await cookies()).set('snaproom_session',token,{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/',maxAge:2592000});
    const method = identity.provider === 'google.com' ? 'google' : identity.provider === 'apple.com' ? 'apple' : 'password';
    trackGrowth({ event: 'login', who: viewerId, key: `login:${hash(token)}`, properties: { method } });
    if (isNewAccount) trackGrowth({ event: 'sign_up', who: viewerId, key: `sign_up:${viewerId}`, properties: { method } });
    return Response.json({viewerId, authAnalytics: { method, isNewAccount }},{headers:{'Cache-Control':'no-store'}});
  });
}
