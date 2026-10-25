import {trackGrowth} from '@/lib/growth';
import {requireTerms} from '@/lib/safety';
import {notifySharedPhotos} from '@/lib/push';
import {randomUUID} from 'node:crypto';
import {connection} from 'next/server';
import {ApiError,json,safe,sameOrigin,transaction,uuid,viewer} from '@/lib/server';
import {limitWrites,targetAccess,textBody} from '@/lib/memories';
import {parseNoteColor} from '@/lib/comment-note';
export async function GET(request:Request){await connection();return safe(async()=>{
 const who=await viewer(),q=new URL(request.url).searchParams;
 const offset=Number(q.get('offset')||0);if(!Number.isInteger(offset)||offset<0||offset>100000)throw new ApiError(400,'INVALID_PAGE');
 const data=await transaction(async db=>{
  const t=await targetAccess(db,who,q.get('kind'),q.get('id'));
  const comments=await db.query(`SELECT c.*,COALESCE(NULLIF(a.display_name,''),v.display_name,'') author,
   (SELECT p.id FROM snaproom.photos p WHERE p.id=c.note_photo_id AND p.folder_id=$4 AND p.deleted_at IS NULL AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$3)) visible_note_photo
   FROM snaproom.comments c LEFT JOIN snaproom.accounts a ON a.viewer_id=c.owner_id LEFT JOIN snaproom.viewers v ON v.id=c.owner_id WHERE c.${t.column}=$1 AND NOT c.hidden AND snaproom.interaction_allowed(c.owner_id,$3) ORDER BY c.created_at,c.id LIMIT 31 OFFSET $2`,[t.id,offset,who,t.folder_id]);
  const reactions=await db.query(`SELECT count(*)::int AS count,COALESCE(bool_or(owner_id=$2),false) AS liked FROM snaproom.reactions WHERE ${t.column}=$1 AND snaproom.interaction_allowed(owner_id,$2)`,[t.id,who]);
  return {comments:comments.rows.slice(0,30).map(c=>({id:c.id,body:c.body,author:c.author,mine:c.owner_id===who,createdAt:c.created_at,updatedAt:c.updated_at,revision:c.revision,color:c.note_color,photoId:c.visible_note_photo})),mine:t.owner_id===who,hasMore:comments.rows.length>30,...reactions.rows[0],manager:t.manager===who,shared:t.shared,audience:!t.shared?'private':t.recipients.length?'selected':'all'};
 });return Response.json(data,{headers:{'Cache-Control':'private, no-store'}});
});}
export async function POST(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),b=await json(request);await requireTerms(who);
 let notifyFolder:string|undefined;
 const data=await transaction(async db=>{
  const t=await targetAccess(db,who,b.kind,b.targetId);
  if(b.action==='comment'||b.action==='like')notifyFolder=t.folder_id;
  if(b.action==='like'){
   if(typeof b.liked!=='boolean')throw new ApiError(400,'INVALID_REACTION');
   if(b.liked)await db.query(`INSERT INTO snaproom.reactions(id,${t.column},owner_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,[randomUUID(),t.id,who]);
   else await db.query(`DELETE FROM snaproom.reactions WHERE ${t.column}=$1 AND owner_id=$2`,[t.id,who]);
  }else if(b.action==='comment'){
   const id=uuid(b.id),body=textBody(b.body,1000);await limitWrites(db,who);
   let color;try{color=parseNoteColor(b.color);}catch{throw new ApiError(400,'INVALID_NOTE_COLOR');}
   const photoId=b.photoId==null?null:uuid(b.photoId);
   if(photoId){
    const photo=await db.query(`SELECT p.id FROM snaproom.photos p WHERE p.id=$1 AND p.folder_id=$2 AND p.deleted_at IS NULL
     AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$3)
     AND (p.id=$4::uuid OR EXISTS(SELECT 1 FROM snaproom.record_photos rp WHERE rp.photo_id=p.id AND rp.record_id=$5::uuid))`,
     [photoId,t.folder_id,who,b.kind==='photo'?t.id:null,b.kind==='record'?t.id:null]);
    if(!photo.rowCount)throw new ApiError(400,'INVALID_NOTE_PHOTO');
   }
   const old=await db.query('SELECT owner_id,photo_id,record_id FROM snaproom.comments WHERE id=$1',[id]);
   if(old.rowCount){if(old.rows[0].owner_id!==who||old.rows[0][t.column]!==t.id)throw new ApiError(409,'CONFLICT');}
   else await db.query(`INSERT INTO snaproom.comments(id,${t.column},owner_id,body,note_color,note_photo_id) VALUES($1,$2,$3,$4,$5,$6)`,[id,t.id,who,body,color,photoId]);
  }else if(b.action==='report'){
   const id=uuid(b.commentId),reason=textBody(b.reason,500);
   const c=await db.query(`SELECT 1 FROM snaproom.comments WHERE id=$1 AND ${t.column}=$2 AND NOT hidden AND snaproom.interaction_allowed(owner_id,$3)`,[id,t.id,who]);
   if(!c.rowCount)throw new ApiError(404,'NOT_FOUND');
   await db.query('INSERT INTO snaproom.comment_reports(id,comment_id,owner_id,reason) VALUES($1,$2,$3,$4) ON CONFLICT(comment_id,owner_id) DO UPDATE SET reason=excluded.reason,status=\'open\'',[randomUUID(),id,who,reason]);
   await db.query("INSERT INTO snaproom.safety_reports(id,comment_id,reporter_id,reason) VALUES($1,$2,$3,$4) ON CONFLICT(reporter_id,comment_id) DO UPDATE SET reason=excluded.reason,status='open',resolved_at=NULL",[randomUUID(),id,who,reason]);
  }else throw new ApiError(400,'INVALID_ACTION');
  return {ok:true};
 });if(b.action==='comment'&&notifyFolder)trackGrowth({event:'note_created',who,contextId:notifyFolder,key:`note:${b.id}`});if(notifyFolder)await notifySharedPhotos([notifyFolder],who).catch(()=>console.error('Interaction notification delivery failed'));return Response.json(data);
});}
export async function PATCH(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),b=await json(request);await requireTerms(who);
 await transaction(async db=>{
  const t=await targetAccess(db,who,b.kind,b.targetId),id=uuid(b.id);
  const c=await db.query(`SELECT owner_id FROM snaproom.comments WHERE id=$1 AND ${t.column}=$2 AND NOT hidden FOR UPDATE`,[id,t.id]);
  if(!c.rowCount)throw new ApiError(404,'NOT_FOUND');if(c.rows[0].owner_id!==who)throw new ApiError(403,'NOT_OWNED');
  if(!Number.isInteger(b.revision))throw new ApiError(400,'INVALID_REVISION');
  const result=await db.query('UPDATE snaproom.comments SET body=$1,updated_at=now(),revision=revision+1 WHERE id=$2 AND revision=$3 RETURNING id',[textBody(b.body,1000),id,b.revision]);
  if(!result.rowCount)throw new ApiError(409,'EDIT_CONFLICT');
 });return Response.json({ok:true});
});}
export async function DELETE(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),b=await json(request);
 await transaction(async db=>{
  const t=await targetAccess(db,who,b.kind,b.targetId),id=uuid(b.id);
  const c=await db.query(`SELECT owner_id FROM snaproom.comments WHERE id=$1 AND ${t.column}=$2 FOR UPDATE`,[id,t.id]);
  if(!c.rowCount)throw new ApiError(404,'NOT_FOUND');if(c.rows[0].owner_id!==who)throw new ApiError(403,'NOT_OWNED');
  await db.query('DELETE FROM snaproom.comments WHERE id=$1',[id]);
 });return Response.json({ok:true});
});}
