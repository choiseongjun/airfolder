import {connection} from 'next/server';
import {ApiError,json,pool,safe,sameOrigin,transaction,uuid,viewer} from '@/lib/server';
export async function GET(request:Request){await connection();return safe(async()=>{
 const who=await viewer(),folder=uuid(new URL(request.url).searchParams.get('folderId'));
 const owner=await pool().query('SELECT 1 FROM snaproom.folders WHERE id=$1 AND owner_id=$2',[folder,who]);if(!owner.rowCount)throw new ApiError(404,'NOT_FOUND');
 const reports=await pool().query(`SELECT r.id,r.reason,r.created_at,c.body FROM snaproom.comment_reports r JOIN snaproom.comments c ON c.id=r.comment_id LEFT JOIN snaproom.records n ON n.id=c.record_id LEFT JOIN snaproom.photos p ON p.id=c.photo_id WHERE COALESCE(n.folder_id,p.folder_id)=$1 AND snaproom.can_view(COALESCE(n.owner_id,p.owner_id),COALESCE(n.shared,p.shared),COALESCE(n.recipients,p.recipients),$2) AND r.status='open' ORDER BY r.created_at LIMIT 100`,[folder,who]);
 return Response.json({reports:reports.rows},{headers:{'Cache-Control':'private, no-store'}});
});}
export async function PATCH(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),b=await json(request);if(b.action!=='hide'&&b.action!=='dismiss')throw new ApiError(400,'INVALID_ACTION');
 await transaction(async db=>{
  const r=await db.query(`SELECT r.comment_id FROM snaproom.comment_reports r JOIN snaproom.comments c ON c.id=r.comment_id LEFT JOIN snaproom.records n ON n.id=c.record_id LEFT JOIN snaproom.photos p ON p.id=c.photo_id JOIN snaproom.folders f ON f.id=COALESCE(n.folder_id,p.folder_id) WHERE r.id=$1 AND f.owner_id=$2 AND snaproom.can_view(COALESCE(n.owner_id,p.owner_id),COALESCE(n.shared,p.shared),COALESCE(n.recipients,p.recipients),$2) FOR UPDATE OF c`,[uuid(b.id),who]);
  if(!r.rowCount)throw new ApiError(404,'NOT_FOUND');
  if(b.action==='hide')await db.query('UPDATE snaproom.comments SET hidden=true WHERE id=$1',[r.rows[0].comment_id]);
  await db.query('UPDATE snaproom.comment_reports SET status=$1 WHERE comment_id=$2',[b.action==='hide'?'hidden':'dismissed',r.rows[0].comment_id]);
 });return Response.json({ok:true});
});}
