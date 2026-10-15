import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { ApiError, hash, json, pool, safe, sameOrigin, transaction, viewer } from '@/lib/server';
import { firebaseAdminAuth } from '@/lib/firebase-server';
import { identityFromVerifiedClaims } from '@/lib/auth-core';
export async function DELETE(request:Request){return safe(async()=>{
  sameOrigin(request);const who=await viewer(),body=await json(request);
  if(body.confirm!=='DELETE')throw new ApiError(400,'CONFIRM_DELETION');
  const account=(await pool().query('SELECT firebase_uid,provider FROM snaproom.accounts WHERE viewer_id=$1',[who])).rows[0];
  if(account?.provider==='apple.com'){
    if(typeof body.idToken!=='string'||body.idToken.length>16384||typeof body.appleAccessToken!=='string'||body.appleAccessToken.length>8192||!body.appleAccessToken)throw new ApiError(400,'APPLE_REAUTH_REQUIRED');
    try{
      const identity=identityFromVerifiedClaims(await firebaseAdminAuth().verifyIdToken(body.idToken));
      if(identity.uid!==account.firebase_uid||identity.provider!=='apple.com')throw new Error();
    }catch{throw new ApiError(401,'APPLE_REAUTH_REQUIRED');}
    const key=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if(!key)throw new ApiError(503,'AUTH_NOT_CONFIGURED');
    const revoked=await fetch(`https://identitytoolkit.googleapis.com/v2/accounts:revokeToken?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({providerId:'apple.com',tokenType:'ACCESS_TOKEN',token:body.appleAccessToken,idToken:body.idToken})});
    if(!revoked.ok)throw new ApiError(502,'APPLE_REVOCATION_FAILED');
  }
  const receipt=randomBytes(32).toString('hex');
  await transaction(async db=>{
    await db.query('UPDATE snaproom.viewers SET deletion_requested_at=COALESCE(deletion_requested_at,now()) WHERE id=$1',[who]);
    await db.query('INSERT INTO snaproom.deletion_receipts(token_hash,viewer_id) VALUES($1,$2)',[hash(receipt),who]);
    await db.query('DELETE FROM snaproom.sessions WHERE viewer_id=$1',[who]);
  });
  (await cookies()).set('snaproom_session','',{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/',maxAge:0});
  return Response.json({status:'deletion_requested',completeWithinDays:30,receipt}, {status:202,headers:{'Cache-Control':'no-store'}});
});}
