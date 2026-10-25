import {connection} from 'next/server';
import {ApiError,pool,requireMember,safe,uuid,viewer} from '@/lib/server';

export async function GET(request:Request){
 await connection();
 return safe(async()=>{
  const who=await viewer(),query=new URL(request.url).searchParams,folder=uuid(query.get('folderId'));
  await requireMember(folder,who);
  const after=query.get('after')?uuid(query.get('after')):null;
  const album=await pool().query('SELECT name FROM snaproom.folders WHERE id=$1 AND deleted_at IS NULL',[folder]);
  if(!album.rowCount)throw new ApiError(404,'NOT_FOUND');
  const photos=await pool().query(`SELECT p.id,p.name,p.mime,p.original_available FROM snaproom.photos p
   WHERE p.folder_id=$1 AND p.deleted_at IS NULL AND NOT p.safety_hidden AND NOT p.capsule_hold
   AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$2) AND ($3::uuid IS NULL OR p.id>$3)
   ORDER BY p.id LIMIT 21`,[folder,who,after]);
  const page=photos.rows.slice(0,20),ids=page.map(p=>p.id);
  const comments=await pool().query(`SELECT c.id,c.body,c.created_at,c.photo_id,c.record_id,COALESCE(NULLIF(a.display_name,''),v.display_name,'') author
   FROM snaproom.comments c JOIN snaproom.viewers v ON v.id=c.owner_id LEFT JOIN snaproom.accounts a ON a.viewer_id=c.owner_id
   LEFT JOIN snaproom.records r ON r.id=c.record_id
   WHERE NOT c.hidden AND snaproom.interaction_allowed(c.owner_id,$2)
   AND (c.photo_id=ANY($1::uuid[]) OR (r.folder_id=$3 AND r.deleted_at IS NULL AND NOT r.safety_hidden AND NOT r.capsule_hold
   AND snaproom.can_view(r.owner_id,r.shared,r.recipients,$2) AND EXISTS(SELECT 1 FROM snaproom.record_photos rp WHERE rp.record_id=r.id AND rp.photo_id=ANY($1::uuid[]))))
   ORDER BY c.created_at,c.id`,[ids,who,folder]);
  const links=await pool().query('SELECT record_id,photo_id FROM snaproom.record_photos WHERE photo_id=ANY($1::uuid[])',[ids]);
  const records=after?{rows:[]}:await pool().query(`SELECT r.id,r.title,r.body,r.recorded_on FROM snaproom.records r WHERE r.folder_id=$1 AND r.deleted_at IS NULL AND NOT r.safety_hidden AND NOT r.capsule_hold AND snaproom.can_view(r.owner_id,r.shared,r.recipients,$2) ORDER BY r.recorded_on,r.id`,[folder,who]);
  const notes=after?{rows:[]}:await pool().query(`SELECT n.id,n.body,n.created_at,COALESCE(NULLIF(a.display_name,''),v.display_name,'') author FROM snaproom.rolling_paper_notes n JOIN snaproom.viewers v ON v.id=n.owner_id LEFT JOIN snaproom.accounts a ON a.viewer_id=n.owner_id WHERE n.folder_id=$1 AND NOT n.hidden AND snaproom.interaction_allowed(n.owner_id,$2) ORDER BY n.created_at,n.id`,[folder,who]);
  return Response.json({title:album.rows[0].name,records:records.rows,notes:notes.rows,photos:page.map(p=>({...p,comments:comments.rows.filter(c=>c.photo_id===p.id||links.rows.some(l=>l.photo_id===p.id&&l.record_id===c.record_id))})),next:photos.rows.length>20?page.at(-1)!.id:null},{headers:{'Cache-Control':'private, no-store'}});
 });
}
