import {requireTerms} from '@/lib/safety';
import { randomUUID } from 'node:crypto';
import { ApiError, json, pool, safe, sameOrigin, transaction, uuid, viewer } from '@/lib/server';
import { folderDates } from '@/lib/folder-dates';
export async function PATCH(request:Request){return safe(async()=>{
  sameOrigin(request);const who=await viewer(),body=await json(request),id=uuid(body.id),groupId=uuid(body.groupId);await requireTerms(who);
  await transaction(async db=>{
    await db.query('SELECT id FROM snaproom.groups WHERE id=$1 FOR UPDATE',[groupId]);
    const member=await db.query('SELECT 1 FROM snaproom.group_members WHERE group_id=$1 AND viewer_id=$2',[groupId,who]);if(!member.rowCount)throw new ApiError(404,'GROUP_NOT_FOUND');
    const f=await db.query('SELECT * FROM snaproom.folders WHERE id=$1 AND owner_id=$2 FOR UPDATE',[id,who]);if(!f.rowCount)throw new ApiError(403,'OWNER_REQUIRED');
    if(f.rows[0].group_id===groupId)return;
    if(f.rows[0].group_id)throw new ApiError(409,'ALREADY_IN_GROUP');
    const others=await db.query(`SELECT EXISTS(SELECT 1 FROM snaproom.members WHERE folder_id=$1 AND viewer_id<>$2)
      OR EXISTS(SELECT 1 FROM snaproom.photos WHERE folder_id=$1 AND owner_id<>$2)
      OR EXISTS(SELECT 1 FROM snaproom.records WHERE folder_id=$1 AND owner_id<>$2) blocked`,[id,who]);
    if(others.rows[0].blocked)throw new ApiError(409,'SHARED_ALBUM_CANNOT_MOVE');
    await db.query('UPDATE snaproom.folders SET group_id=$2,updated_at=now() WHERE id=$1',[id,groupId]);
    await db.query('DELETE FROM snaproom.invites WHERE folder_id=$1',[id]);
  });return Response.json({ok:true});
});}
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request); const who = await viewer();await requireTerms(who); const body = await json(request);
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80 || typeof (body.description ?? '') !== 'string' || (body.description ?? '').length > 500) throw new ApiError(400, 'INVALID_FOLDER');
    const count = await pool().query('SELECT count(*) FROM snaproom.folders WHERE owner_id=$1', [who]);
    if (Number(count.rows[0].count) >= 100) throw new ApiError(409, 'FOLDER_LIMIT');
    const id = randomUUID(); const category = ['여행','모임','업무','개인'].includes(body.category) ? body.category : '개인';
    let dates: [string | null, string | null];
    try { dates = folderDates(body.startDate, body.endDate); } catch { throw new ApiError(400, 'INVALID_DATE_RANGE'); }
    const groupId=body.groupId?uuid(body.groupId):null;
    await transaction(async db => {
      if(groupId){await db.query('SELECT id FROM snaproom.groups WHERE id=$1 FOR UPDATE',[groupId]);const m=await db.query('SELECT 1 FROM snaproom.group_members WHERE group_id=$1 AND viewer_id=$2',[groupId,who]);if(!m.rowCount)throw new ApiError(404,'GROUP_NOT_FOUND');}
      await db.query('INSERT INTO snaproom.folders(id,owner_id,name,category,description,starts_on,ends_on,group_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, who, body.name.trim(), category, body.description || '', ...dates,groupId]);
      await db.query('INSERT INTO snaproom.members(folder_id,viewer_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, who]);
    });
    return Response.json({ id }, { status: 201 });
  });
}
