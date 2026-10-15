import { ApiError, pool, storage, uuid } from '@/lib/server';
import { adminSafe, requireAdmin } from '@/lib/admin';
import { reportMedia } from '@/lib/admin-moderation';

export async function GET(request: Request) { return adminSafe(async () => {
  await requireAdmin();
  const params = new URL(request.url).searchParams, report = uuid(params.get('report')), photo = uuid(params.get('photo'));
  const result = await reportMedia(pool(), report), item = result.rows.find(row => row.id === photo);
  if (!item) throw new ApiError(404, 'MEDIA_NOT_FOUND');
  const usePreview = item.preview_path && item.preview_status === 'ready';
  const mime = usePreview ? (item.preview_mime || 'image/jpeg') : item.mime_type;
  if (!['image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/quicktime','video/webm'].includes(mime)) throw new ApiError(415, 'PREVIEW_UNAVAILABLE');
  const signed = await storage().createSignedUrl(usePreview ? item.preview_path : item.object_path, 60);
  if (signed.error || !signed.data) throw new ApiError(503, 'MEDIA_UNAVAILABLE');
  const range = request.headers.get('range');
  if (range && !/^bytes=\d*-\d*$/.test(range)) throw new ApiError(416, 'INVALID_RANGE');
  const response = await fetch(signed.data.signedUrl, { headers: range ? { Range: range } : {}, cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new ApiError(response.status === 416 ? 416 : 503, 'MEDIA_UNAVAILABLE');
  const headers = new Headers({ 'Content-Type': mime, 'Content-Security-Policy': "default-src 'none'; sandbox", 'Content-Disposition': 'inline' });
  for (const name of ['content-length','content-range','accept-ranges']) { const value = response.headers.get(name); if (value) headers.set(name, value); }
  return new Response(response.body, { status: response.status, headers });
}); }
