import {randomBytes,randomUUID} from 'node:crypto';
import {ApiError,hash,json,pool,safe,sameOrigin,transaction,uuid,viewer} from '@/lib/server';
export async function GET(){return safe(async()=>{
 const who=await viewer();const result=await pool().query(`SELECT l.id,l.access,l.expires_at,count(lp.photo_id)::int count FROM snaproom.share_links l JOIN snaproom.share_link_photos lp ON lp.link_id=l.id WHERE l.owner_id=$1 AND l.revoked_at IS NULL AND l.expires_at>now() GROUP BY l.id ORDER BY l.created_at DESC LIMIT 100`,[who]);
 return Response.json({links:result.rows},{headers:{'Cache-Control':'no-store'}});
});}
export async function POST(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),body=await json(request);
 if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>200)throw new ApiError(400,'INVALID_SELECTION');
 const access=body.access===undefined?'members':body.access;
 if(access!=='public'&&access!=='members')throw new ApiError(400,'INVALID_ACCESS');
 const ids=[...new Set(body.ids.map(uuid))],id=randomUUID(),token=randomBytes(32).toString('hex');
 await transaction(async db=>{
  const record=body.recordId?uuid(body.recordId):null;
  if(record){const valid=await db.query(`SELECT r.id FROM snaproom.records r WHERE r.id=$1 AND r.owner_id=$2 AND r.shared AND ($4='members' OR cardinality(r.recipients)=0) AND (SELECT count(*) FROM snaproom.record_photos WHERE record_id=r.id AND photo_id=ANY($3::uuid[]))=cardinality($3::uuid[]) FOR SHARE`,[record,who,ids,access]);if(!valid.rowCount)throw new ApiError(403,'RECORD_NOT_SHAREABLE');}
  const photos=await db.query(`SELECT p.id FROM snaproom.photos p JOIN snaproom.members m ON m.folder_id=p.folder_id AND m.viewer_id=$2 WHERE snaproom.album_active(p.folder_id) AND p.id=ANY($1::uuid[]) AND p.owner_id=$2 AND p.shared AND ($3='members' OR cardinality(p.recipients)=0) FOR SHARE OF p,m`,[ids,who,access]);
  if(photos.rowCount!==ids.length)throw new ApiError(403,'PUBLIC_OWN_PHOTOS_REQUIRED');
  await db.query('INSERT INTO snaproom.share_links(id,token_hash,owner_id,access,record_id) VALUES($1,$2,$3,$4,$5)',[id,hash(token),who,access,record]);
  await db.query('INSERT INTO snaproom.share_link_photos(link_id,photo_id) SELECT $1,unnest($2::uuid[])',[id,ids]);
 });return Response.json({id,token,expiresInDays:7},{status:201,headers:{'Cache-Control':'no-store'}});
});}
export async function DELETE(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),body=await json(request);
 await pool().query('UPDATE snaproom.share_links SET revoked_at=now() WHERE id=$1 AND owner_id=$2',[uuid(body.id),who]);return Response.json({ok:true});
});}
