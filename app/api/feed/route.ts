import {connection} from 'next/server';
import {ApiError,pool,safe,uuid,viewer} from '@/lib/server';

const MONTHLY_GOAL = 25;
// Same fallback as the group member list; expects viewers as v and accounts as a.
const NAME = `COALESCE(NULLIF(a.display_name,''),v.display_name,'Member '||left(v.id::text,6))`;

// A crew's home feed: its members, this month's photo count, and recent stories and photos with
// their latest comments and likes. Uses the same visibility rules as the workspace and discussion routes.
export async function GET(request:Request){await connection();return safe(async()=>{
 const who=await viewer(),q=new URL(request.url).searchParams,zone=q.get('timezone')||'UTC',requested=q.get('group');
 try{new Intl.DateTimeFormat('en',{timeZone:zone}).format();}catch{throw new ApiError(400,'INVALID_TIMEZONE');}
 const db=pool();
 await db.query('SELECT snaproom.reveal_due_capsules($1)',[who]);
 const groups=(await db.query(`SELECT g.id,g.name,g.owner_id,(SELECT count(*)::int FROM snaproom.group_members WHERE group_id=g.id) members
  FROM snaproom.groups g JOIN snaproom.group_members m ON m.group_id=g.id AND m.viewer_id=$1 ORDER BY g.created_at DESC`,[who])).rows;
 // No choice yet: open the newest crew, or the personal space when there is none.
 const group=requested==='personal'?null:requested?uuid(requested):groups[0]?.id??null;
 const crew=group?groups.find(g=>g.id===group):null;
 if(group&&!crew)throw new ApiError(404,'GROUP_NOT_FOUND');

 const members=crew?(await db.query(`SELECT v.id,${NAME} AS name FROM snaproom.group_members gm JOIN snaproom.viewers v ON v.id=gm.viewer_id
   LEFT JOIN snaproom.accounts a ON a.viewer_id=v.id WHERE gm.group_id=$1 AND (v.id=$2 OR snaproom.interaction_allowed(v.id,$2))
   ORDER BY v.id=$2 DESC,v.id=$3 DESC,gm.joined_at`,[group,who,crew.owner_id])).rows
  :(await db.query(`SELECT v.id,${NAME} AS name FROM snaproom.viewers v LEFT JOIN snaproom.accounts a ON a.viewer_id=v.id WHERE v.id=$1`,[who])).rows;

 const scope=`SELECT f.id,f.name FROM snaproom.folders f JOIN snaproom.members m ON m.folder_id=f.id AND m.viewer_id=$1
  WHERE f.deleted_at IS NULL AND (($2::uuid IS NULL AND f.group_id IS NULL) OR f.group_id=$2)`;
 const month=(await db.query(`WITH scope AS (${scope}), uploads AS (
   SELECT p.owner_id,p.created_at AT TIME ZONE $3 AS local FROM snaproom.photos p JOIN scope s ON s.id=p.folder_id
   WHERE snaproom.can_view(p.owner_id,p.shared,p.recipients,$1) AND p.created_at AT TIME ZONE $3>=date_trunc('month',now() AT TIME ZONE $3))
  SELECT count(*)::int AS count,count(*) FILTER (WHERE local>=date_trunc('day',now() AT TIME ZONE $3))::int AS today,
   COALESCE(array_agg(DISTINCT owner_id::text),'{}'::text[]) AS contributors FROM uploads`,[who,group,zone])).rows[0];

 const items=(await db.query(`WITH scope AS (${scope})
  SELECT * FROM (
   SELECT 'record' AS kind,r.id,r.folder_id,s.name AS album,r.owner_id,r.created_at,r.title,r.body,NULL AS mime FROM snaproom.records r JOIN scope s ON s.id=r.folder_id
    WHERE snaproom.can_view(r.owner_id,r.shared,r.recipients,$1)
   UNION ALL
   SELECT 'photo',p.id,p.folder_id,s.name,p.owner_id,p.created_at,'','',p.mime FROM snaproom.photos p JOIN scope s ON s.id=p.folder_id
    WHERE snaproom.can_view(p.owner_id,p.shared,p.recipients,$1)
     AND NOT EXISTS(SELECT 1 FROM snaproom.record_photos rp JOIN snaproom.records r ON r.id=rp.record_id WHERE rp.photo_id=p.id AND snaproom.can_view(r.owner_id,r.shared,r.recipients,$1))
  ) feed ORDER BY created_at DESC,id LIMIT 12`,[who,group])).rows;

 const ids=(kind:string)=>items.filter(i=>i.kind===kind).map(i=>i.id);
 const [photoIds,recordIds]=[ids('photo'),ids('record')];
 const people=new Set<string>([...items.map(i=>i.owner_id),...month.contributors]);
 const [attached,comments,likes]=await Promise.all([
  db.query(`SELECT rp.record_id,p.id,p.mime,count(*) OVER(PARTITION BY rp.record_id)::int AS total,row_number() OVER(PARTITION BY rp.record_id ORDER BY rp.position) n
   FROM snaproom.record_photos rp JOIN snaproom.photos p ON p.id=rp.photo_id WHERE rp.record_id=ANY($1::uuid[]) AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$2)`,[recordIds,who]),
  db.query(`SELECT * FROM (SELECT c.id,c.photo_id,c.record_id,c.owner_id,c.body,c.created_at,
    count(*) OVER(PARTITION BY c.photo_id,c.record_id)::int AS total,row_number() OVER(PARTITION BY c.photo_id,c.record_id ORDER BY c.created_at DESC,c.id) n
   FROM snaproom.comments c WHERE (c.photo_id=ANY($1::uuid[]) OR c.record_id=ANY($2::uuid[])) AND NOT c.hidden AND snaproom.interaction_allowed(c.owner_id,$3)) ranked WHERE n<=2`,[photoIds,recordIds,who]),
  db.query(`SELECT photo_id,record_id,count(*)::int AS count,COALESCE(bool_or(owner_id=$3),false) AS liked FROM snaproom.reactions
   WHERE (photo_id=ANY($1::uuid[]) OR record_id=ANY($2::uuid[])) AND snaproom.interaction_allowed(owner_id,$3) GROUP BY photo_id,record_id`,[photoIds,recordIds,who]),
 ]);
 for(const c of comments.rows)people.add(c.owner_id);
 const names=new Map<string,string>((await db.query(`SELECT v.id,${NAME} AS name FROM snaproom.viewers v LEFT JOIN snaproom.accounts a ON a.viewer_id=v.id WHERE v.id=ANY($1::uuid[])`,[[...people]])).rows.map(r=>[r.id,r.name]));
 const person=(id:string)=>({id,name:names.get(id)||'',mine:id===who});
 const target=(row:{photo_id:string|null;record_id:string|null})=>row.photo_id||row.record_id;
 const media=(id:string,mime:string)=>({id,src:`/api/photos/${id}/content`,video:mime.startsWith('video/')});

 return Response.json({
  me:who,
  groups:groups.map(g=>({id:g.id,name:g.name,members:g.members})),
  crew:{id:group,name:crew?.name??null,ownerId:crew?.owner_id??null,members:members.map(m=>({...m,mine:m.id===who}))},
  month:{count:month.count,today:month.today,goal:MONTHLY_GOAL,contributors:month.contributors.map(person)},
  items:items.map(i=>{
   const pics=i.kind==='photo'?[media(i.id,i.mime)]:attached.rows.filter(p=>p.record_id===i.id&&p.n<=4).map(p=>media(p.id,p.mime));
   const thread=comments.rows.filter(c=>target(c)===i.id).sort((a,b)=>a.created_at-b.created_at);
   const like=likes.rows.find(l=>target(l)===i.id);
   return {kind:i.kind,id:i.id,folderId:i.folder_id,album:i.album,author:person(i.owner_id),createdAt:i.created_at,title:i.title||'',body:i.body||'',
    photos:pics,photoCount:i.kind==='photo'?1:attached.rows.find(p=>p.record_id===i.id)?.total??0,
    comments:thread.map(c=>({id:c.id,body:c.body,author:person(c.owner_id),createdAt:c.created_at})),commentCount:thread[0]?.total??0,
    likes:like?.count??0,liked:like?.liked??false};
  }),
 },{headers:{'Cache-Control':'private, no-store'}});
});}
