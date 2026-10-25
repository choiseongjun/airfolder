import {trackGrowth} from '@/lib/growth';
import {notifySharedPhotos} from '@/lib/push';
import { randomUUID } from 'node:crypto';
import { connection } from 'next/server';
import { ApiError, json, pool, requireMember, safe, sameOrigin, transaction, uuid, viewer } from '@/lib/server';
import { limitWrites, textBody } from '@/lib/memories';
import { requireTerms } from '@/lib/safety';
import { allowedAlbumDecoration } from '@/lib/album-rewards';

export async function GET(request: Request) {
  await connection();
  return safe(async () => {
    const who = await viewer();
    const folderId = uuid(new URL(request.url).searchParams.get('folderId'));
    await requireMember(folderId, who);
    const result = await pool().query(
      `SELECT n.id,n.body,n.reward_sticker,n.created_at,COALESCE(a.display_name,v.display_name,'') AS author,n.owner_id
       FROM snaproom.rolling_paper_notes n
       JOIN snaproom.viewers v ON v.id=n.owner_id
       LEFT JOIN snaproom.accounts a ON a.viewer_id=n.owner_id
       WHERE n.folder_id=$1 AND NOT n.hidden AND snaproom.interaction_allowed(n.owner_id,$2)
       ORDER BY n.created_at DESC,n.id DESC LIMIT 100`,
      [folderId, who],
    );
    const noteIds = result.rows.map(note => note.id);
    const [photoOptions, attached] = await Promise.all([
      pool().query(
        `SELECT id,name,mime,captured_at FROM snaproom.photos
         WHERE folder_id=$1 AND deleted_at IS NULL AND shared AND cardinality(recipients)=0 AND NOT capsule_hold
         AND snaproom.can_view(owner_id,shared,recipients,$2)
         ORDER BY captured_at DESC,id LIMIT 60`,
        [folderId, who],
      ),
      noteIds.length ? pool().query(
        `SELECT rp.note_id,p.id,p.name,p.mime,p.captured_at
         FROM snaproom.rolling_paper_note_photos rp
         JOIN snaproom.rolling_paper_notes n ON n.id=rp.note_id AND n.folder_id=$1
         JOIN snaproom.photos p ON p.id=rp.photo_id AND p.folder_id=$1
         WHERE rp.note_id=ANY($2::uuid[]) AND p.deleted_at IS NULL AND p.shared AND cardinality(p.recipients)=0 AND NOT p.capsule_hold
         ORDER BY rp.note_id,rp.position`,
        [folderId, noteIds],
      ) : Promise.resolve({ rows: [] }),
    ]);
    const mapPhoto = (photo: { id: string; name: string | null; mime: string; captured_at: Date }) => ({ id: photo.id, name: photo.name || '', mediaType: photo.mime.startsWith('video/') ? 'video' : 'image', src: `/api/photos/${photo.id}/content`, createdAt: photo.captured_at });
    return Response.json({ notes: result.rows.map(note => ({
      id: note.id,
      body: note.body,
      author: note.author || '크루원',
      mine: note.owner_id === who,
      createdAt: note.created_at,
      sticker: note.reward_sticker,
      photos: attached.rows.filter(photo => photo.note_id === note.id).map(mapPhoto),
    })), photoOptions: photoOptions.rows.map(mapPhoto) }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}

export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const who = await viewer();
    const body = await json(request);
    await requireTerms(who);
    const folderId = uuid(body.folderId);
    const id = body.id === undefined ? randomUUID() : uuid(body.id);
    const message = textBody(body.body, 1000);
    const photoIds = body.photoIds === undefined ? [] : body.photoIds;
    if (!Array.isArray(photoIds) || photoIds.length > 4) throw new ApiError(400, 'INVALID_PHOTOS');
    const uniquePhotoIds = [...new Set(photoIds.map(uuid))];
    if (uniquePhotoIds.length !== photoIds.length) throw new ApiError(400, 'INVALID_PHOTOS');
    await requireMember(folderId, who);
    await transaction(async db => {
      await limitWrites(db, who);
      const sticker = body.sticker == null ? null : await allowedAlbumDecoration(db, who, folderId, body.sticker);
      if (uniquePhotoIds.length) {
        const visible = await db.query(
          `SELECT id FROM snaproom.photos WHERE folder_id=$1 AND deleted_at IS NULL AND id=ANY($2::uuid[])
           AND shared AND cardinality(recipients)=0 AND NOT capsule_hold`,
          [folderId, uniquePhotoIds],
        );
        if (visible.rowCount !== uniquePhotoIds.length) throw new ApiError(400, 'INVALID_PHOTOS');
      }
      const prior = await db.query('SELECT owner_id,folder_id,body,reward_sticker FROM snaproom.rolling_paper_notes WHERE id=$1', [id]);
      if (prior.rowCount) {
        if (prior.rows[0].owner_id !== who || prior.rows[0].folder_id !== folderId || prior.rows[0].body !== message) throw new ApiError(409, 'CONFLICT');
        const previous = prior.rows[0].reward_sticker;
        if ((previous?.character ?? null) !== (sticker?.character ?? null) || (previous?.outfit ?? null) !== (sticker?.outfit ?? null) || (previous?.phrase ?? null) !== (sticker?.phrase ?? null)) throw new ApiError(409, 'CONFLICT');
        return;
      }
      await db.query('INSERT INTO snaproom.rolling_paper_notes(id,folder_id,owner_id,body,reward_sticker) VALUES($1,$2,$3,$4,$5)', [id, folderId, who, message, sticker ? JSON.stringify(sticker) : null]);
      for (const [position, photoId] of uniquePhotoIds.entries()) {
        await db.query('INSERT INTO snaproom.rolling_paper_note_photos(note_id,photo_id,position) VALUES($1,$2,$3)', [id, photoId, position]);
      }
    });
    trackGrowth({event:'note_created',who,contextId:folderId,key:`note:${id}`});
    await notifySharedPhotos([folderId],who).catch(()=>console.error('Note notification delivery unavailable'));
    return Response.json({ id }, { status: 201 });
  });
}
