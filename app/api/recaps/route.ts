import {connection} from 'next/server';
import {ApiError,pool,safe,uuid,viewer} from '@/lib/server';
export async function GET(request:Request){await connection();return safe(async()=>{
 const who=await viewer(),q=new URL(request.url).searchParams,zone=q.get('timezone')||'UTC',group=q.get('groupId');
 try{new Intl.DateTimeFormat('en',{timeZone:zone}).format();}catch{throw new ApiError(400,'INVALID_TIMEZONE');}
 if(group)uuid(group);
 const rows=await pool().query(`WITH accessible AS (
 SELECT p.*,f.name album_name,p.captured_at AT TIME ZONE $2 local_date FROM snaproom.photos p
 JOIN snaproom.folders f ON f.id=p.folder_id JOIN snaproom.members m ON m.folder_id=f.id AND m.viewer_id=$1
 WHERE snaproom.can_view(p.owner_id,p.shared,p.recipients,$1) AND (($3::uuid IS NULL AND f.group_id IS NULL) OR f.group_id=$3)
 ), dated AS (SELECT *,CASE WHEN to_char(local_date,'MM-DD')=to_char(now() AT TIME ZONE $2,'MM-DD') AND extract(year FROM local_date)<extract(year FROM now() AT TIME ZONE $2) THEN 'anniversary'
 ELSE 'month' END kind FROM accessible WHERE (to_char(local_date,'MM-DD')=to_char(now() AT TIME ZONE $2,'MM-DD') AND extract(year FROM local_date)<extract(year FROM now() AT TIME ZONE $2))
 OR (local_date>=date_trunc('month',now() AT TIME ZONE $2)-interval '1 month' AND local_date<date_trunc('month',now() AT TIME ZONE $2)))
 SELECT * FROM (SELECT id,folder_id,album_name,mime,local_date,extract(year FROM local_date)::int AS captured_year,kind,count(*) OVER(PARTITION BY kind)::int total,row_number() OVER(PARTITION BY kind ORDER BY local_date DESC,id) n FROM dated) ranked WHERE n<=6 ORDER BY kind,local_date DESC`,[who,zone,group]);
 return Response.json({items:rows.rows.map(p=>({id:p.id,folderId:p.folder_id,album:p.album_name,kind:p.kind,total:p.total,mediaType:p.mime.startsWith('video/')?'video':'image',src:`/api/photos/${p.id}/content`,year:p.captured_year}))},{headers:{'Cache-Control':'private, no-store'}});
});}
