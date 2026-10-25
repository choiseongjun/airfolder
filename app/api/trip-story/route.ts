import {connection} from 'next/server';
import {ApiError,json,pool,requireMember,safe,sameOrigin,transaction,uuid,viewer} from '@/lib/server';
import {requireTerms} from '@/lib/safety';
import {limitWrites,textBody} from '@/lib/memories';
import {characterAnimals} from '@/lib/character-style';
import {storyAccess,storyPhotoVisibility} from '@/lib/trip-story-server';
import {trackGrowth} from '@/lib/growth';
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
export async function GET(request:Request){await connection();return safe(async()=>{
 const q=new URL(request.url).searchParams,folder=uuid(q.get('folderId')),who=await viewer(),token=q.get('token'),album=await storyAccess(folder,who,token);
 const result=await pool().query(`SELECT n.id,n.owner_id,n.body,e.display_name,e.animal,e.use_profile AND cp.active IS NOT NULL AS avatar,
  count(*) OVER()::int AS total FROM snaproom.rolling_paper_notes n JOIN snaproom.trip_story_entries e ON e.note_id=n.id
  LEFT JOIN snaproom.character_profiles cp ON cp.viewer_id=n.owner_id
  WHERE n.folder_id=$1 AND NOT n.hidden AND snaproom.interaction_allowed(n.owner_id,$2)
  ORDER BY n.created_at,n.id LIMIT 100`,[folder,who]);
 const ids=result.rows.map(n=>n.id);
 const photos=ids.length?(await pool().query(`SELECT rp.note_id,p.id FROM snaproom.rolling_paper_note_photos rp JOIN snaproom.photos p ON p.id=rp.photo_id
  WHERE rp.note_id=ANY($1::uuid[]) AND p.folder_id=$2 AND ${storyPhotoVisibility} AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$3) ORDER BY rp.note_id,rp.position`,[ids,folder,who])).rows:[];
 const invite=token?'&token='+encodeURIComponent(token):'';
 return Response.json({folderId:folder,title:album.name,canInvite:!album.group_id&&album.owner_id===who,total:result.rows[0]?.total||0,people:new Set(result.rows.map(n=>n.owner_id)).size,entries:result.rows.map(n=>({id:n.id,personId:n.owner_id,name:n.display_name,body:n.body,animal:n.animal,mine:n.owner_id===who,avatar:n.avatar?`/api/trip-story/character?folderId=${folder}&noteId=${n.id}${invite}`:null,photos:photos.filter(p=>p.note_id===n.id).map(p=>({id:p.id,src:`/api/photos/${p.id}/content${token?'?invite='+encodeURIComponent(token):''}`}))}))},{headers});
});}
export async function POST(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),body=await json(request),folder=uuid(body.folderId),id=uuid(body.id);
 await requireTerms(who);await storyAccess(folder,who,null);
 const name=textBody(body.name,30),message=textBody(body.body,280);
 if(!characterAnimals.some(a=>a.id===body.animal)||typeof body.useProfile!=='boolean')throw new ApiError(400,'INVALID_CHARACTER');
 if(!Array.isArray(body.photoIds)||body.photoIds.length<1||body.photoIds.length>3)throw new ApiError(400,'INVALID_PHOTOS');
 const ids=body.photoIds.map(uuid) as string[];if(new Set(ids).size!==ids.length)throw new ApiError(400,'INVALID_PHOTOS');
 const created=await transaction(async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['trip-story:'+id]);
  const prior=await db.query('SELECT n.*,e.display_name,e.animal,e.use_profile FROM snaproom.rolling_paper_notes n JOIN snaproom.trip_story_entries e ON e.note_id=n.id WHERE n.id=$1',[id]);
  if(prior.rowCount){const n=prior.rows[0];const old=(await db.query('SELECT photo_id FROM snaproom.rolling_paper_note_photos WHERE note_id=$1 ORDER BY position',[id])).rows.map(r=>r.photo_id);
   if(n.owner_id!==who||n.folder_id!==folder||n.body!==message||n.display_name!==name||n.animal!==body.animal||n.use_profile!==body.useProfile||JSON.stringify(old)!==JSON.stringify(ids))throw new ApiError(409,'CONFLICT');return false;}
  await limitWrites(db,who);
  const recent=await db.query("SELECT count(*)::int count FROM snaproom.rolling_paper_notes WHERE owner_id=$1 AND created_at>now()-interval '1 minute'",[who]);
  if(recent.rows[0].count>=20)throw new ApiError(429,'RATE_LIMITED');
  const valid=await db.query(`SELECT p.id FROM snaproom.photos p WHERE p.id=ANY($1::uuid[]) AND p.folder_id=$2 AND p.owner_id=$3 AND p.mime LIKE 'image/%' AND ${storyPhotoVisibility} FOR SHARE`,[ids,folder,who]);
  if(valid.rowCount!==ids.length)throw new ApiError(400,'INVALID_PHOTOS');
  if(body.useProfile&&!(await db.query('SELECT 1 FROM snaproom.character_profiles WHERE viewer_id=$1 AND active IS NOT NULL',[who])).rowCount)throw new ApiError(400,'NO_ACTIVE_CHARACTER');
  await db.query('INSERT INTO snaproom.rolling_paper_notes(id,folder_id,owner_id,body) VALUES($1,$2,$3,$4)',[id,folder,who,message]);
  await db.query('INSERT INTO snaproom.trip_story_entries(note_id,display_name,animal,use_profile) VALUES($1,$2,$3,$4)',[id,name,body.animal,body.useProfile]);
  for(const [position,photo] of ids.entries())await db.query('INSERT INTO snaproom.rolling_paper_note_photos(note_id,photo_id,position) VALUES($1,$2,$3)',[id,photo,position]);
  return true;
 });
 if(created){const album=await pool().query('SELECT owner_id FROM snaproom.folders WHERE id=$1',[folder]);trackGrowth({event:album.rows[0].owner_id===who?'trip_story_saved':'trip_story_contributed',who,key:`trip_story:${id}`,contextId:folder,properties:{flow:'trip_story',attempt_id:body.attempt_id,photo_count:ids.length}});}
 return Response.json({id,created},{status:201,headers});
});}
export async function DELETE(request:Request){return safe(async()=>{sameOrigin(request);const who=await viewer(),body=await json(request),folder=uuid(body.folderId),id=uuid(body.id);await requireMember(folder,who);
 const result=await pool().query('DELETE FROM snaproom.rolling_paper_notes n USING snaproom.trip_story_entries e WHERE n.id=e.note_id AND n.id=$1 AND n.folder_id=$2 AND n.owner_id=$3',[id,folder,who]);if(!result.rowCount)throw new ApiError(404,'NOTE_NOT_FOUND');return Response.json({ok:true},{headers});});}
