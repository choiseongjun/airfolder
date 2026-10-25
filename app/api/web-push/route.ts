import {connection} from 'next/server';
import {ApiError,hash,json,pool,safe,sameOrigin,sessionToken,transaction,viewer} from '@/lib/server';
import {webPushKeys} from '@/lib/web-push';
import {validPushEndpoint,validPushKey} from '@/lib/web-push-validation';
import {trackGrowth} from '@/lib/growth';
export async function GET(){await connection();return safe(async()=>{await viewer();return Response.json({publicKey:(await webPushKeys()).public_key},{headers:{'Cache-Control':'private, no-store'}});});}
export async function POST(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),token=await sessionToken(),b=await json(request);
 if(!token||!validPushEndpoint(b.endpoint)||!validPushKey(b.keys?.p256dh,65)||!validPushKey(b.keys?.auth,16))throw new ApiError(400,'INVALID_SUBSCRIPTION');
 await transaction(async db=>{await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['web-push:'+who]);
  const n=await db.query('SELECT count(*)::int n FROM snaproom.web_push_subscriptions WHERE viewer_id=$1 AND endpoint<>$2',[who,b.endpoint]);if(n.rows[0].n>=5)throw new ApiError(409,'DEVICE_LIMIT');
  const saved=await db.query(`INSERT INTO snaproom.web_push_subscriptions(endpoint,viewer_id,session_hash,p256dh,auth) VALUES($1,$2,$3,$4,$5) ON CONFLICT(endpoint) DO UPDATE SET viewer_id=EXCLUDED.viewer_id,session_hash=EXCLUDED.session_hash,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,updated_at=now() WHERE web_push_subscriptions.viewer_id=EXCLUDED.viewer_id OR (web_push_subscriptions.auth=EXCLUDED.auth AND web_push_subscriptions.p256dh=EXCLUDED.p256dh) RETURNING endpoint`,[b.endpoint,who,hash(token),b.keys.p256dh,b.keys.auth]);if(!saved.rowCount)throw new ApiError(409,'SUBSCRIPTION_CONFLICT');});
 trackGrowth({event:'web_push_enabled',who,key:`web_push:${who}:${hash(b.endpoint)}`});return Response.json({ok:true});
});}
export async function DELETE(request:Request){return safe(async()=>{sameOrigin(request);const who=await viewer(),b=await json(request);if(!validPushEndpoint(b.endpoint))throw new ApiError(400,'INVALID_SUBSCRIPTION');await pool().query('DELETE FROM snaproom.web_push_subscriptions WHERE viewer_id=$1 AND endpoint=$2',[who,b.endpoint]);return Response.json({ok:true});});}
