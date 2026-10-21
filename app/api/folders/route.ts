import {requireActiveViewer} from '@/lib/safety';
import { randomUUID } from 'node:crypto';
import { ApiError, json, pool, safe, sameOrigin, transaction, uuid, viewer } from '@/lib/server';
import { folderDates } from '@/lib/folder-dates';
import { trackGrowth } from '@/lib/growth';
import { deleteAlbum, restoreAlbum } from '@/lib/album-deletion';
import { ALBUM_THEME_IDS, CAPSULE_MAX_DAYS, SONG_MAX } from '@/lib/album-style';
import { allowedAlbumDecoration } from '@/lib/album-rewards';
export async function GET(){return safe(async()=>{
  const who=await viewer();
  const result=await pool().query(`SELECT id,name,deleted_at,deleted_at+interval '30 days' AS expires_at,deleted_at<=now()-interval '30 days' AS expired FROM snaproom.folders WHERE owner_id=$1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`,[who]);
  return Response.json({albums:result.rows},{headers:{'Cache-Control':'private, no-store'}});
});}
export async function PUT(request:Request){return safe(async()=>{
  sameOrigin(request);const who=await viewer(),body=await json(request);
  if(body.action==='style'){
    // The owner sets the look, the song and the time capsule for everyone in the album.
    const id=uuid(body.id),sets:string[]=[],values:unknown[]=[id,who];
    if(body.theme!==undefined){if(!ALBUM_THEME_IDS.includes(body.theme))throw new ApiError(400,'INVALID_THEME');values.push(body.theme);sets.push('theme=$'+values.length);}
    if(body.song!==undefined){if(typeof body.song!=='string'||body.song.trim().length>SONG_MAX)throw new ApiError(400,'INVALID_SONG');values.push(body.song.trim());sets.push('song=$'+values.length);}
    if(body.revealAt!==undefined){
      // 'now' opens the capsule early; there is no way to cancel it and leave held photos hidden.
      const at=body.revealAt==='now'?new Date():new Date(String(body.revealAt));
      if(Number.isNaN(at.getTime())||(body.revealAt!=='now'&&(at.getTime()<Date.now()+60000||at.getTime()>Date.now()+CAPSULE_MAX_DAYS*86400000)))throw new ApiError(400,'INVALID_REVEAL_TIME');
      values.push(at.toISOString());sets.push('reveal_at=$'+values.length);
    }
    if(!sets.length)throw new ApiError(400,'NOTHING_TO_UPDATE');
    await requireActiveViewer(who);
    const updated=await pool().query(`UPDATE snaproom.folders SET ${sets.join(',')} WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL RETURNING id`,values);
    if(!updated.rowCount)throw new ApiError(403,'OWNER_REQUIRED');
    if(body.revealAt==='now')await pool().query('SELECT snaproom.reveal_due_capsules($1)',[who]);
    return Response.json({ok:true});
  }
  if(body.action!=='restore')throw new ApiError(400,'INVALID_ACTION');
  await transaction(db=>restoreAlbum(db,uuid(body.id),who));return Response.json({ok:true});
});}
export async function DELETE(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const who = await viewer(), body = await json(request), id = uuid(body.id);
    if (body.confirm !== 'DELETE_ALBUM') throw new ApiError(400,'CONFIRMATION_REQUIRED');
    await transaction(db => deleteAlbum(db,id,who,body.name));
    return Response.json({ok:true});
  });
}
export async function PATCH(request:Request){return safe(async()=>{
  sameOrigin(request);const who=await viewer(),body=await json(request),id=uuid(body.id),groupId=uuid(body.groupId);await requireActiveViewer(who);
  await transaction(async db=>{
    await db.query('SELECT id FROM snaproom.groups WHERE id=$1 FOR UPDATE',[groupId]);
    const member=await db.query('SELECT 1 FROM snaproom.group_members WHERE group_id=$1 AND viewer_id=$2',[groupId,who]);if(!member.rowCount)throw new ApiError(404,'GROUP_NOT_FOUND');
    const f=await db.query('SELECT * FROM snaproom.folders WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL FOR UPDATE',[id,who]);if(!f.rowCount)throw new ApiError(403,'OWNER_REQUIRED');
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
    sameOrigin(request); const who = await viewer();await requireActiveViewer(who); const body = await json(request);
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80 || typeof (body.description ?? '') !== 'string' || (body.description ?? '').length > 500) throw new ApiError(400, 'INVALID_FOLDER');
    const count = await pool().query('SELECT count(*) FROM snaproom.folders WHERE owner_id=$1', [who]);
    if (Number(count.rows[0].count) >= 100) throw new ApiError(409, 'FOLDER_LIMIT');
    const id = body.source === 'organizer' && body.creationId ? uuid(body.creationId) : randomUUID(); const category = ['여행','모임','업무','개인','생일'].includes(body.category) ? body.category : '개인';
    let dates: [string | null, string | null];
    try { dates = folderDates(body.startDate, body.endDate); } catch { throw new ApiError(400, 'INVALID_DATE_RANGE'); }
    const groupId=body.groupId?uuid(body.groupId):null;
    const created = await transaction(async db => {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['folder-create:'+id]);
      const existing = await db.query('SELECT owner_id FROM snaproom.folders WHERE id=$1', [id]);
      if (existing.rowCount) { if (existing.rows[0].owner_id !== who) throw new ApiError(409, 'FOLDER_CONFLICT'); return false; }
      if(groupId){await db.query('SELECT id FROM snaproom.groups WHERE id=$1 FOR UPDATE',[groupId]);const m=await db.query('SELECT 1 FROM snaproom.group_members WHERE group_id=$1 AND viewer_id=$2',[groupId,who]);if(!m.rowCount)throw new ApiError(404,'GROUP_NOT_FOUND');}
      await db.query('INSERT INTO snaproom.folders(id,owner_id,name,category,description,starts_on,ends_on,group_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, who, body.name.trim(), category, body.description || '', ...dates,groupId]);
      await db.query('INSERT INTO snaproom.members(folder_id,viewer_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, who]);
      if (body.decoration !== undefined) {
        const decoration = await allowedAlbumDecoration(db, who, id, body.decoration);
        if (decoration?.phrase) delete decoration.phrase;
        await db.query('UPDATE snaproom.folders SET reward_cover=$2 WHERE id=$1', [id, decoration ? JSON.stringify(decoration) : null]);
      }
      return true;
    });
    if (created) trackGrowth({ event: 'album_created', who, key: `album_created:${id}`, contextId: id,
      properties: { source: body.source === 'organizer' ? 'organizer' : 'workspace' } });
    return Response.json({ id, created }, { status: 201 });
  });
}
