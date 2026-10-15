import { ApiError, pool, safe, storage, uuid, viewer } from '@/lib/server';
import { connection } from 'next/server';
import {linkedPhotos} from '@/lib/share-links';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  return safe(async () => {
    const started=performance.now();
    const id = uuid((await context.params).id), query = new URL(request.url).searchParams;
    const sharedToken=query.get('share');
    const who=sharedToken?null:await viewer();
    const rows = sharedToken?{rows:await linkedPhotos(sharedToken,id),rowCount:0}:await pool().query(`SELECT p.* FROM snaproom.photos p JOIN snaproom.members m ON m.folder_id=p.folder_id
      WHERE p.id=$1 AND m.viewer_id=$2 AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$2)`,[id,who]);
    if (!rows.rows.length) throw new ApiError(404,'PHOTO_NOT_FOUND');
    const authorized=performance.now();
    const media = rows.rows[0], original = query.get('original')==='1'||query.get('download')==='1';
    if(query.get('status')==='1')return Response.json({status:media.preview_path?'ready':media.preview_status},{headers:{'Cache-Control':'private, no-store'}});
    if(!original && !media.preview_path && media.original_available) return Response.json({error:media.preview_status==='failed'?'PREVIEW_FAILED':'PREVIEW_PROCESSING'},{status:425,headers:{'Cache-Control':'private, no-store','Retry-After':'15'}});
    const path = !original && media.preview_path ? media.preview_path : media.object_path;
    const mime = !original && media.preview_path ? (media.preview_mime || 'image/jpeg') : media.mime;
    const signed = await storage().createSignedUrl(path,60);
    if(signed.error || !signed.data) throw new ApiError(503,'PHOTO_UNAVAILABLE');
    const signedAt=performance.now();
    const range = request.headers.get('range');
    if(range && !/^bytes=\d*-\d*$/.test(range)) throw new ApiError(416,'INVALID_RANGE');
    const response = await fetch(signed.data.signedUrl,{cache:'no-store',headers:range?{Range:range}:{},signal:request.signal});
    if(!response.ok && response.status!==416) throw new ApiError(503,'PHOTO_UNAVAILABLE');
    const headers = new Headers({'Content-Type':mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'});
    for(const key of ['content-length','content-range']) { const value=response.headers.get(key);if(value)headers.set(key,value); }
    if(query.get('download')==='1') {
      const ext=String(media.object_path).split('.').pop();
      const name=String(media.name).replace(/[\r\n/\\]/g,'_').replace(/\.[^.]+$/,'')+'.'+ext;
      headers.set('Content-Disposition',`attachment; filename="media.${ext}"; filename*=UTF-8''${encodeURIComponent(name).replace(/'/g,'%27')}`);
    }
    headers.set('Server-Timing',`authdb;dur=${(authorized-started).toFixed(1)},sign;dur=${(signedAt-authorized).toFixed(1)},storage;dur=${(performance.now()-signedAt).toFixed(1)}`);
    headers.set('X-Original-Available',String(media.original_available));
    return new Response(response.body,{status:response.status,headers});
  });
}
