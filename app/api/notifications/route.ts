import {connection} from 'next/server';
import {ApiError,json,pool,safe,sameOrigin,uuid,viewer} from '@/lib/server';
export async function GET(){await connection();return safe(async()=>{
 const who=await viewer();
 const result=await pool().query(`SELECT n.id,n.folder_id,n.kind,n.created_at,n.read_at,f.name FROM snaproom.notifications n
 JOIN snaproom.folders f ON f.id=n.folder_id JOIN snaproom.members m ON m.folder_id=f.id AND m.viewer_id=$1
 LEFT JOIN snaproom.photos p ON p.id=n.photo_id LEFT JOIN snaproom.records r ON r.id=n.record_id
 WHERE n.viewer_id=$1 AND snaproom.interaction_allowed(n.actor_id,$1) AND n.created_at>now()-interval '90 days'
 AND ((p.id IS NOT NULL AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$1)) OR (r.id IS NOT NULL AND snaproom.can_view(r.owner_id,r.shared,r.recipients,$1)))
 ORDER BY n.created_at DESC LIMIT 200`,[who]);
 const grouped=new Map<string,{folderId:string;name:string;kind:string;ids:string[];unread:number;createdAt:string}>();
 for(const n of result.rows){const key=n.folder_id+':'+n.kind+':'+new Date(n.created_at).toISOString().slice(0,10);let item=grouped.get(key);if(!item){item={folderId:n.folder_id,name:n.name,kind:n.kind,ids:[],unread:0,createdAt:n.created_at};grouped.set(key,item);}item.ids.push(n.id);if(!n.read_at)item.unread++;}
 return Response.json({items:[...grouped.values()]},{headers:{'Cache-Control':'private, no-store'}});
});}
export async function PATCH(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),b=await json(request);if(!Array.isArray(b.ids)||b.ids.length>200)throw new ApiError(400,'INVALID_SELECTION');
 await pool().query('UPDATE snaproom.notifications SET read_at=now() WHERE viewer_id=$1 AND id=ANY($2::uuid[])',[who,b.ids.map(uuid)]);return Response.json({ok:true});
});}
