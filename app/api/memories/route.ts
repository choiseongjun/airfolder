import {attachPhotos,photoIds} from '@/lib/record-bundles';
import {parseRecipients,checkRecipients} from '@/lib/audience';
import {connection} from 'next/server';
import {ApiError,json,pool,requireMember,safe,sameOrigin,transaction,uuid,viewer} from '@/lib/server';
import {limitWrites,recordDate,targetAccess,textBody} from '@/lib/memories';

export async function GET(request:Request){
 await connection();
 return safe(async()=>{
  const who=await viewer(), q=new URL(request.url).searchParams, folder=uuid(q.get('folderId'));
  const timezone=q.get("timezone")||"UTC";
  try {new Intl.DateTimeFormat("en",{timeZone:timezone});} catch {throw new ApiError(400,"INVALID_TIMEZONE");}
  await requireMember(folder,who);
  const offset=Number(q.get('offset')||0); if(!Number.isInteger(offset)||offset<0||offset>100000)throw new ApiError(400,'INVALID_PAGE');
  const recordId=q.get('recordId');if(recordId)uuid(recordId);
  const rows=await pool().query(`WITH items AS (
   SELECT id,folder_id,owner_id,shared,recipients,'image' AS media_type,true AS has_preview,false AS original_available,recorded_on::timestamptz AS captured_time,body,to_char(recorded_on,'YYYY-MM-DD') AS day,recorded_on::timestamp AS sort_date,'record' AS kind,updated_at,revision,title FROM snaproom.records WHERE folder_id=$1 AND snaproom.can_view(owner_id,shared,recipients,$2)
   UNION ALL SELECT id,folder_id,owner_id,shared,recipients,CASE WHEN mime LIKE 'video/%' THEN 'video' ELSE 'image' END,preview_path IS NOT NULL OR NOT original_available,original_available,captured_at,name,to_char(captured_at AT TIME ZONE $4,'YYYY-MM-DD'),captured_at AT TIME ZONE $4,'photo',created_at,0,'' FROM snaproom.photos p WHERE folder_id=$1 AND snaproom.can_view(owner_id,shared,recipients,$2) AND NOT EXISTS(SELECT 1 FROM snaproom.record_photos rp JOIN snaproom.records r ON r.id=rp.record_id WHERE rp.photo_id=p.id AND snaproom.can_view(r.owner_id,r.shared,r.recipients,$2))
  ) SELECT i.*,COALESCE(a.display_name,v.display_name,'') AS author FROM items i LEFT JOIN snaproom.accounts a ON a.viewer_id=i.owner_id JOIN snaproom.viewers v ON v.id=i.owner_id WHERE ($5::uuid IS NULL OR (i.kind='record' AND i.id=$5)) ORDER BY sort_date DESC,id DESC LIMIT 31 OFFSET $3`,[folder,who,offset,timezone,recordId]);
  const attachments=await pool().query(`SELECT rp.record_id,p.*,rp.position FROM snaproom.record_photos rp JOIN snaproom.photos p ON p.id=rp.photo_id WHERE rp.record_id=ANY($1::uuid[]) AND p.folder_id=$2 AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$3) ORDER BY rp.position`,[rows.rows.filter(r=>r.kind==='record').map(r=>r.id),folder,who]);
  return Response.json({items:rows.rows.slice(0,30).map(r=>({id:r.id,kind:r.kind,title:r.title,photos:attachments.rows.filter(p=>p.record_id===r.id).map(p=>({id:p.id,kind:"photo",body:p.name,src:`/api/photos/${p.id}/content`,mediaType:p.mime.startsWith("video/")?"video":"image",shared:p.shared,mine:p.owner_id===who,created:new Date(p.captured_at).getTime(),originalAvailable:p.original_available,audience:!p.shared?"private":p.recipients.length?"selected":"all",recipients:p.owner_id===who?p.recipients:[]})),body:r.body,created:new Date(r.captured_time).getTime(),day:r.day,shared:r.shared,audience:!r.shared?'private':r.recipients.length?'selected':'all',recipients:r.owner_id===who?r.recipients:[],mediaType:r.media_type,hasPreview:r.has_preview,originalAvailable:r.original_available,mine:r.owner_id===who,author:r.author,updatedAt:r.updated_at,revision:r.revision,src:r.kind==='photo'?`/api/photos/${r.id}/content`:undefined})),hasMore:rows.rows.length>30},{headers:{'Cache-Control':'private, no-store'}});
 });
}
export async function POST(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),b=await json(request),folder=uuid(b.folderId),id=uuid(b.id);
 const ids=photoIds(b.photoIds),title=b.title===undefined?'':String(b.title).trim();if(title.length>120)throw new ApiError(400,'INVALID_TITLE');
 const body=textBody(b.body||title||(ids?.length?'사진 기록':''),4000),day=recordDate(b.day);if(typeof b.shared!=='boolean')throw new ApiError(400,'INVALID_VISIBILITY');
 await requireMember(folder,who);
 await transaction(async db=>{
  await limitWrites(db,who);
  const recipients=parseRecipients(b.recipients,b.shared); await checkRecipients(db,[folder],recipients);
  const old=await db.query('SELECT owner_id,folder_id FROM snaproom.records WHERE id=$1',[id]);
  if(old.rowCount){if(old.rows[0].owner_id!==who||old.rows[0].folder_id!==folder)throw new ApiError(409,'CONFLICT');return;}
  await db.query('INSERT INTO snaproom.records(id,folder_id,owner_id,body,recorded_on,shared,recipients,title) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,folder,who,body,day,b.shared,recipients,title]);
  await attachPhotos(db,id,folder,who,ids);
  await db.query('UPDATE snaproom.folders SET updated_at=now() WHERE id=$1',[folder]);
 });return Response.json({id},{status:201});
});}
export async function PATCH(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),b=await json(request);
 await transaction(async db=>{
  const target=await targetAccess(db,who,'record',b.id);if(target.owner_id!==who)throw new ApiError(403,'NOT_OWNED');
  if(typeof b.shared!=='boolean')throw new ApiError(400,'INVALID_VISIBILITY');
  if(!Number.isInteger(b.revision))throw new ApiError(400,'INVALID_REVISION');
  const recipients=parseRecipients(b.recipients,b.shared); await checkRecipients(db,[target.folder_id],recipients);
  const ids=photoIds(b.photoIds);const title=b.title===undefined?undefined:String(b.title).trim();if(title&&title.length>120)throw new ApiError(400,'INVALID_TITLE');
  const updated=await db.query('UPDATE snaproom.records SET title=COALESCE($7,title),body=$1,recorded_on=$2,shared=$3,recipients=$6,updated_at=now(),revision=revision+1 WHERE id=$4 AND revision=$5 RETURNING id',[textBody(b.body||title||(ids?.length?'사진 기록':''),4000),recordDate(b.day),b.shared,target.id,b.revision,recipients,title??null]);
  if(!updated.rowCount)throw new ApiError(409,'EDIT_CONFLICT');
  await attachPhotos(db,target.id,target.folder_id,who,ids);
 });return Response.json({ok:true});
});}
export async function DELETE(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),b=await json(request);
 await transaction(async db=>{const target=await targetAccess(db,who,'record',b.id);if(target.owner_id!==who)throw new ApiError(403,'NOT_OWNED');await db.query('DELETE FROM snaproom.records WHERE id=$1',[target.id]);});
 return Response.json({ok:true});
});}
