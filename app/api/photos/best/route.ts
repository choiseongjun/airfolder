import {connection} from 'next/server';
import {pool,requireMember,safe,uuid,viewer} from '@/lib/server';
export async function GET(request:Request){await connection();return safe(async()=>{
 const who=await viewer(),folder=uuid(new URL(request.url).searchParams.get('folderId'));await requireMember(folder,who);
 const result=await pool().query(`SELECT p.id,p.name,p.folder_id,
 (SELECT count(*)::int FROM snaproom.reactions r WHERE r.photo_id=p.id AND snaproom.interaction_allowed(r.owner_id,$2)) AS votes
 FROM snaproom.photos p WHERE p.folder_id=$1 AND snaproom.album_active(p.folder_id) AND p.mime LIKE 'image/%' AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$2)
 ORDER BY votes DESC,p.captured_at DESC,p.id LIMIT 4`,[folder,who]);
 return Response.json({photos:result.rows.map(p=>({id:p.id,name:p.name,roomId:p.folder_id,src:`/api/photos/${p.id}/content`,votes:p.votes}))},{headers:{'Cache-Control':'private, no-store'}});
});}
