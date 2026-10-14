import {randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
import {connection,NextResponse} from 'next/server';
import {ApiError,hash,safe,sessionToken,transaction,viewer} from '@/lib/server';
import {nativeTokenPattern} from '@/lib/mobile-auth-core';
export async function GET(request:Request){await connection();return safe(async()=>{
 // Only a native Authorization header may bootstrap a WebView. A browser cookie alone is insufficient.
 if(!request.headers.has('authorization'))throw new ApiError(401,'NATIVE_SESSION_REQUIRED');
 const token=await sessionToken();if(!token||!nativeTokenPattern.test(token))throw new ApiError(401,'NATIVE_SESSION_REQUIRED');
 const who=await viewer(),child=randomBytes(32).toString('hex');
 const expiry=await transaction(async db=>{
  const parent=await db.query('SELECT expires_at FROM snaproom.sessions WHERE token_hash=$1 AND viewer_id=$2 AND expires_at>now() AND parent_hash IS NULL FOR UPDATE',[hash(token),who]);
  if(!parent.rowCount)throw new ApiError(401,'SESSION_EXPIRED');
  await db.query('DELETE FROM snaproom.sessions WHERE parent_hash=$1',[hash(token)]);
  await db.query('INSERT INTO snaproom.sessions(token_hash,viewer_id,expires_at,parent_hash) VALUES($1,$2,$3,$4)',[hash(child),who,parent.rows[0].expires_at,hash(token)]);
  return new Date(parent.rows[0].expires_at);
 });
 (await cookies()).set('snaproom_session',child,{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/',maxAge:Math.max(1,Math.floor((expiry.getTime()-Date.now())/1000))});
 const lang=new URL(request.url).searchParams.get('lang')==='ko'?'ko':'en';
 const response=NextResponse.redirect(new URL('/?lang='+lang,request.url),303);response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
});}
