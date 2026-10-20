import {requireTerms} from '@/lib/safety';
import {trackGrowth} from '@/lib/growth';
import { notifySharedPhotos } from '@/lib/push';
import {checkStorageQuota} from '@/lib/storage-quota';
import {imagePreview} from '@/lib/image-preview';
import {stagedUpload} from '@/lib/staged-upload';
import {pool} from '@/lib/server';
export const maxDuration = 60;
import {uploadDisk} from '@/lib/upload-disk';
import {VIDEO_LIMIT,mediaLimit} from '@/lib/media-limits';
import {createReadStream} from 'node:fs';
import { fileTypeFromFile } from 'file-type';
import { parseRecipients, checkRecipients } from '@/lib/audience';
import { ApiError, json, requireMember, safe, sameOrigin, storage, storageFileLimit, transaction, uuid, viewer } from '@/lib/server';

const limit = VIDEO_LIMIT;
const allowed = new Set(['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif','video/mp4','video/quicktime','video/webm']);
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request); const who = await viewer();await requireTerms(who);
    if (Number(request.headers.get('content-length') || 0) > limit + 65536) throw new ApiError(413, 'MEDIA_TOO_LARGE');
    const storageLimit=await storageFileLimit();
    if(Number(request.headers.get('content-length')||0)>storageLimit+65536)throw new ApiError(413,'STORAGE_LIMIT_REQUIRES_UPGRADE');
    const staged=request.headers.get('content-type')?.includes('application/json');
    const upload = staged ? await stagedUpload((await json(request)).uploadId,who) : await uploadDisk(request,limit);
    try {
    const data = new Map(Object.entries(upload.fields)); const folder = uuid(data.get('folderId')), id = uuid(data.get('id'));
    await requireMember(folder, who);

    const captured = Number(data.get('created'));
    if (!Number.isFinite(captured) || captured < 0 || captured > Date.now() + 86400000) throw new ApiError(400, 'INVALID_DATE');
    const type = await fileTypeFromFile(upload.path);
    if (!type || !allowed.has(type.mime)) throw new ApiError(400, 'UNSUPPORTED_MEDIA');
    if(upload.size>mediaLimit(type.mime))throw new ApiError(413,'MEDIA_TOO_LARGE');
    if(upload.size>storageLimit)throw new ApiError(413,'STORAGE_LIMIT_REQUIRES_UPGRADE');
    let preview: Buffer | undefined;
    if (type.mime.startsWith('image/')) {
      try { preview = await imagePreview(upload.path,type.mime); }
      catch { throw new ApiError(400,'INVALID_IMAGE'); }
    }
    const objectPath = `${who}/${folder}/${id}.${type.ext}`, previewPath = preview ? `${who}/${folder}/${id}.preview.jpg` : null;
    const shared = data.get('shared') === 'true';
    let recipientInput: unknown;
    const recipientField = data.get('recipients');
    if (typeof recipientField === 'string') { try { recipientInput = JSON.parse(recipientField); } catch { throw new ApiError(400, 'INVALID_RECIPIENTS'); } }
    const inserted = await transaction(async db => {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['media:'+id]);
      const existing = await db.query('SELECT owner_id,folder_id FROM snaproom.photos WHERE id=$1',[id]);
      if (existing.rowCount) {
        if (existing.rows[0].owner_id!==who || existing.rows[0].folder_id!==folder) throw new ApiError(409,'PHOTO_CONFLICT');
        return false;
      }
      const membership = await db.query('SELECT 1 FROM snaproom.members WHERE folder_id=$1 AND viewer_id=$2 AND snaproom.album_active(folder_id) FOR SHARE',[folder,who]);
      if (!membership.rowCount) throw new ApiError(404,'FOLDER_NOT_FOUND');
      const recipients = parseRecipients(recipientInput, shared);
      await checkRecipients(db, [folder], recipients);
      await checkStorageQuota(db,who,upload.size+(preview?.length??Math.max(upload.size,1048576)));
      const uploaded = await storage().upload(objectPath,createReadStream(upload.path),{contentType:type.mime,upsert:true});
      if (uploaded.error) throw new ApiError(/maximum allowed size|too large|exceeded/i.test(uploaded.error.message)?413:503,/maximum allowed size|too large|exceeded/i.test(uploaded.error.message)?'STORAGE_LIMIT_REQUIRES_UPGRADE':'UPLOAD_FAILED');
      if (preview && previewPath) {
        const uploadedPreview = await storage().upload(previewPath,preview,{contentType:'image/jpeg',upsert:true});
        if (uploadedPreview.error) { await storage().remove([objectPath]); throw new ApiError(503,'UPLOAD_FAILED'); }
      }
      try {
        await db.query(`INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,mime,size_bytes,shared,recipients,captured_at,preview_path,original_available,preview_mime,preview_status)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12,$13)`,[id,folder,who,String(data.get('name')||upload.filename||'Media').slice(0,200),objectPath,type.mime,upload.size,shared,recipients,new Date(captured),previewPath,preview?'image/jpeg':null,preview?'ready':'pending']);
        if(preview)await db.query('UPDATE snaproom.photos SET preview_size_bytes=$2 WHERE id=$1',[id,preview.length]);
        await db.query('UPDATE snaproom.folders SET updated_at=now() WHERE id=$1',[folder]);
      } catch (error) { await storage().remove([objectPath,...(previewPath?[previewPath]:[])]); throw error; }
      return true;
    });
    if(inserted) trackGrowth({event:'upload_succeeded',who,key:`upload_succeeded:${id}`,contextId:folder,
      properties:{media_type:type.mime.startsWith('image/')?'image':'video',shared}});
    if(staged)await pool().query('DELETE FROM snaproom.upload_sessions WHERE id=$1 AND owner_id=$2',[id,who]);
    if (shared) await notifySharedPhotos([folder],who).catch(()=>console.error('Push notification delivery failed'));
    return Response.json({id},{status:201});
    } finally {await upload.cleanup();}
  });
}
export async function PATCH(request: Request) {
  return safe(async () => {
    sameOrigin(request); const who = await viewer(), body = await json(request);await requireTerms(who);
    if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 200 || typeof body.shared !== 'boolean') throw new ApiError(400,'INVALID_SELECTION');
    const ids = [...new Set(body.ids.map(uuid))], recipients = parseRecipients(body.recipients,body.shared);
    const folders: string[] = [];
    await transaction(async db => {
      const rows = await db.query('SELECT p.id,p.folder_id FROM snaproom.photos p JOIN snaproom.members m ON m.folder_id=p.folder_id AND m.viewer_id=$2 WHERE p.deleted_at IS NULL AND snaproom.album_active(p.folder_id) AND p.id=ANY($1::uuid[]) AND p.owner_id=$2 FOR UPDATE OF p',[ids,who]);
      if (rows.rowCount!==ids.length) throw new ApiError(403,'PHOTO_NOT_OWNED');
      folders.push(...rows.rows.map(p=>p.folder_id));
      await checkRecipients(db,folders,recipients);
      await db.query('UPDATE snaproom.photos SET shared=$1,recipients=$2 WHERE id=ANY($3::uuid[])',[body.shared,recipients,ids]);
    });
    if(body.shared) await notifySharedPhotos(folders,who,recipients).catch(()=>console.error('Push notification delivery failed'));
    return Response.json({updated:ids.length});
  });
}

export async function DELETE(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const who = await viewer(), body = await json(request), id = uuid(body.id);
    await transaction(async db => {
      const row = await db.query(`SELECT p.id,p.folder_id
        FROM snaproom.photos p JOIN snaproom.members m ON m.folder_id=p.folder_id AND m.viewer_id=$2
        WHERE p.id=$1 AND p.owner_id=$2 AND p.deleted_at IS NULL AND snaproom.album_active(p.folder_id) FOR UPDATE OF p`, [id, who]);
      if (!row.rowCount) throw new ApiError(404, 'NOT_FOUND');
      await db.query('UPDATE snaproom.photos SET deleted_at=now() WHERE id=$1', [id]);
      await db.query('UPDATE snaproom.folders SET updated_at=now() WHERE id=$1', [row.rows[0].folder_id]);
    });
    return Response.json({ ok: true });
  });
}
