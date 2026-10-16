import {requireTerms} from '@/lib/safety';
import {trackGrowth} from '@/lib/growth';
import {randomUUID,randomBytes} from 'node:crypto';
import {connection} from 'next/server';
import {ApiError,hash,json,pool,safe,sameOrigin,transaction,uuid,viewer} from '@/lib/server';
import {textBody} from '@/lib/memories';

export async function GET(request:Request){await connection();return safe(async()=>{
 const who=await viewer(),id=new URL(request.url).searchParams.get('id');
 if(id){
  const member=await pool().query('SELECT 1 FROM snaproom.group_members WHERE group_id=$1 AND viewer_id=$2',[uuid(id),who]);if(!member.rowCount)throw new ApiError(404,'GROUP_NOT_FOUND');
  const members=await pool().query(`SELECT m.viewer_id id,COALESCE(NULLIF(a.display_name,''),v.display_name,'Member '||left(m.viewer_id::text,6)) name,m.viewer_id=$2 mine,g.owner_id=m.viewer_id owner,m.joined_at,a.viewer_id IS NOT NULL registered FROM snaproom.group_members m JOIN snaproom.groups g ON g.id=m.group_id JOIN snaproom.viewers v ON v.id=m.viewer_id LEFT JOIN snaproom.accounts a ON a.viewer_id=m.viewer_id WHERE m.group_id=$1 ORDER BY (g.owner_id=m.viewer_id) DESC,m.joined_at`,[id,who]);
  const invites=await pool().query('SELECT i.expires_at FROM snaproom.group_invites i JOIN snaproom.groups g ON g.id=i.group_id WHERE i.group_id=$1 AND g.owner_id=$2 AND i.expires_at>now()',[id,who]);
  return Response.json({members:members.rows,invites:invites.rows},{headers:{'Cache-Control':'private, no-store'}});
 }
 const result=await pool().query(`SELECT g.id,g.name,g.description,g.owner_id=$1 mine,m.muted,
 (SELECT count(*)::int FROM snaproom.group_members WHERE group_id=g.id) members,
 (SELECT count(*)::int FROM snaproom.folders WHERE group_id=g.id AND deleted_at IS NULL) albums
 FROM snaproom.groups g JOIN snaproom.group_members m ON m.group_id=g.id AND m.viewer_id=$1 ORDER BY g.created_at DESC`,[who]);
 return Response.json({groups:result.rows},{headers:{'Cache-Control':'private, no-store'}});
});}
export async function POST(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),b=await json(request);await requireTerms(who);
 const id=await transaction(async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['group-create:'+who]);
  const count=await db.query('SELECT count(*)::int n FROM snaproom.groups WHERE owner_id=$1',[who]);if(count.rows[0].n>=50)throw new ApiError(409,'GROUP_LIMIT');
  const id=randomUUID();await db.query('INSERT INTO snaproom.groups(id,owner_id,name,description) VALUES($1,$2,$3,$4)',[id,who,textBody(b.name,80),b.description?textBody(b.description,500):'']);
  await db.query('INSERT INTO snaproom.group_members(group_id,viewer_id) VALUES($1,$2)',[id,who]);return id;
 });return Response.json({id},{status:201});
});}
export async function PATCH(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),b=await json(request),id=uuid(b.id);await requireTerms(who);
 const data=await transaction(async db=>{
  const rows=await db.query('SELECT * FROM snaproom.groups WHERE id=$1 FOR UPDATE',[id]);if(!rows.rowCount)throw new ApiError(404,'GROUP_NOT_FOUND');const group=rows.rows[0];
  const membership=await db.query('SELECT 1 FROM snaproom.group_members WHERE group_id=$1 AND viewer_id=$2',[id,who]);if(!membership.rowCount)throw new ApiError(404,'GROUP_NOT_FOUND');
  if(b.action==='mute'){if(typeof b.muted!=='boolean')throw new ApiError(400,'INVALID_SETTING');await db.query('UPDATE snaproom.group_members SET muted=$3 WHERE group_id=$1 AND viewer_id=$2',[id,who,b.muted]);return {ok:true};}
  if(b.action==='leave'||b.action==='remove'){
   const target=b.action==='leave'?who:uuid(b.memberId);
   if(target===group.owner_id)throw new ApiError(409,'TRANSFER_OWNERSHIP_FIRST');
   if(target!==who&&group.owner_id!==who)throw new ApiError(403,'OWNER_REQUIRED');
   await db.query('UPDATE snaproom.folders SET owner_id=$3 WHERE group_id=$1 AND owner_id=$2',[id,target,group.owner_id]);
   await db.query('DELETE FROM snaproom.group_members WHERE group_id=$1 AND viewer_id=$2',[id,target]);
   // Rotate outstanding links when removing a member so they cannot immediately rejoin.
   await db.query('DELETE FROM snaproom.group_invites WHERE group_id=$1',[id]);return {ok:true};
  }
  if(group.owner_id!==who)throw new ApiError(403,'OWNER_REQUIRED');
  if(b.action==='invite'){
   const token=randomBytes(32).toString('hex');await db.query('DELETE FROM snaproom.group_invites WHERE group_id=$1',[id]);
   await db.query('INSERT INTO snaproom.group_invites(token_hash,group_id) VALUES($1,$2)',[hash(token),id]);return {token};
  }
  if(b.action==='revoke'){await db.query('DELETE FROM snaproom.group_invites WHERE group_id=$1',[id]);return {ok:true};}
  if(b.action==='transfer'){
   const target=uuid(b.memberId);const m=await db.query('SELECT 1 FROM snaproom.group_members WHERE group_id=$1 AND viewer_id=$2',[id,target]);if(!m.rowCount)throw new ApiError(400,'NOT_A_MEMBER');
   await db.query('UPDATE snaproom.groups SET owner_id=$2 WHERE id=$1',[id,target]);return {ok:true};
  }
  if(b.action==='rename'){await db.query('UPDATE snaproom.groups SET name=$2 WHERE id=$1',[id,textBody(b.name,80)]);return {ok:true};}
  throw new ApiError(400,'INVALID_ACTION');
 });
 if ('token' in data && data.token) trackGrowth({event:'invite_created',who,key:`invite_created:${hash(data.token)}`,contextId:id,properties:{invite_type:'group'}});
 return Response.json(data,{headers:{'Cache-Control':'no-store'}});
});}
