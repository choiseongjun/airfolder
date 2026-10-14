import {connection} from 'next/server';
import {ApiError,pool,requireMember,safe,uuid,viewer} from '@/lib/server';
export async function GET(request:Request){
  await connection();
  return safe(async()=>{
    const who=await viewer(),q=new URL(request.url).searchParams,folder=uuid(q.get('folderId'));
    await requireMember(folder,who);
    const offset=Number(q.get('offset')||0);
    if(!Number.isInteger(offset)||offset<0||offset>100000)throw new ApiError(400,'INVALID_PAGE');
    const result=await pool().query(`SELECT id,name,shared,recipients,owner_id,captured_at,original_available FROM snaproom.photos
      WHERE folder_id=$1 AND mime LIKE 'image/%' AND (preview_path IS NOT NULL OR NOT original_available)
      AND snaproom.can_view(owner_id,shared,recipients,$2) ORDER BY captured_at DESC,id DESC LIMIT 51 OFFSET $3`,[folder,who,offset]);
    return Response.json({items:result.rows.slice(0,50).map(p=>({id:p.id,name:p.name,src:'/api/photos/'+p.id+'/content',shared:p.shared,mine:p.owner_id===who,created:new Date(p.captured_at).getTime(),originalAvailable:p.original_available,audience:!p.shared?'private':p.recipients.length?'selected':'all',recipients:p.owner_id===who?p.recipients:[]})),hasMore:result.rows.length>50},{headers:{'Cache-Control':'private, no-store'}});
  });
}
