import { notifySharedPhotos } from '@/lib/push';
import sharp from 'sharp';
import { ApiError, json, pool, requireMember, safe, sameOrigin, storage, transaction, uuid, viewer } from '@/lib/server';

export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request); const who = await viewer();
    if (Number(request.headers.get('content-length') || 0) > 16 * 1024 * 1024) throw new ApiError(413, 'PHOTO_TOO_LARGE');
    const data = await request.formData(); const folder = uuid(data.get('folderId')), id = uuid(data.get('id'));
    await requireMember(folder, who);
    const existing = await pool().query('SELECT owner_id,folder_id FROM snaproom.photos WHERE id=$1', [id]);
    if (existing.rowCount) {
      if (existing.rows[0].owner_id !== who || existing.rows[0].folder_id !== folder) throw new ApiError(409, 'PHOTO_CONFLICT');
      return Response.json({ id }); // Idempotent retry after a lost response.
    }
    const file = data.get('file');
    if (!(file instanceof File) || !file.size || file.size > 15 * 1024 * 1024) throw new ApiError(400, 'INVALID_PHOTO');
    const captured = Number(data.get('created'));
    if (!Number.isFinite(captured) || captured < 0 || captured > Date.now() + 86400000) throw new ApiError(400, 'INVALID_DATE');
    let bytes: Buffer;
    try {
      bytes = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 }).rotate().resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    } catch { throw new ApiError(400, 'INVALID_IMAGE'); }
    const objectPath = `${who}/${folder}/${id}.jpg`;
    const uploaded = await storage().upload(objectPath, bytes, { contentType: 'image/jpeg', upsert: true });
    if (uploaded.error) throw new ApiError(503, 'UPLOAD_FAILED');
    await transaction(async db => {
      await db.query(`INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,size_bytes,shared,captured_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING`, [id, folder, who, String(data.get('name') || 'Photo').slice(0, 200), objectPath, bytes.length, data.get('shared') === 'true', new Date(captured)]);
      await db.query('UPDATE snaproom.folders SET updated_at=now() WHERE id=$1', [folder]);
    });
    if(data.get('shared')==='true') await notifySharedPhotos([folder],who).catch(()=>console.error('Push notification delivery failed'));
    return Response.json({ id }, { status: 201 });
  });
}
export async function PATCH(request: Request) {
  return safe(async () => {
    sameOrigin(request); const who = await viewer(), body = await json(request);
    if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 200 || typeof body.shared !== 'boolean') throw new ApiError(400, 'INVALID_SELECTION');
    const ids = [...new Set(body.ids.map(uuid))];
    const changedFolders: string[] = [];
    await transaction(async db => {
      const rows = await db.query('SELECT id,folder_id,shared FROM snaproom.photos WHERE id=ANY($1::uuid[]) AND owner_id=$2 FOR UPDATE', [ids, who]);
      if (rows.rowCount !== ids.length) throw new ApiError(403, 'PHOTO_NOT_OWNED');
      if(body.shared) changedFolders.push(...rows.rows.filter(p=>!p.shared).map(p=>p.folder_id));
      await db.query('UPDATE snaproom.photos SET shared=$1 WHERE id=ANY($2::uuid[]) AND owner_id=$3', [body.shared, ids, who]);
    });
    await notifySharedPhotos(changedFolders,who).catch(()=>console.error('Push notification delivery failed'));
    return Response.json({ updated: ids.length });
  });
}
