import { ApiError, hash, json, pool, safe, sameOrigin } from '@/lib/server';

// A guest tapping a shared link should see the whole album immediately: the organizer chose
// to send this link, so holding it is the access control, not each photo's own privacy
// setting (which still governs the authenticated workspace view for members). This never
// touches viewer()/cookies, so it works the same with or without a session.
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const body = await json(request);
    if (typeof body.token !== 'string' || !/^[a-f\d]{64}$/.test(body.token)) throw new ApiError(400, 'INVALID_INVITE');
    const timezone = typeof body.timezone === 'string' ? body.timezone : 'UTC';
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { throw new ApiError(400, 'INVALID_TIMEZONE'); }
    const folder = await pool().query(
      `SELECT f.id,f.theme,f.song FROM snaproom.invites i JOIN snaproom.folders f ON f.id=i.folder_id AND f.deleted_at IS NULL
       WHERE i.token_hash=$1 AND i.expires_at>now() AND f.group_id IS NULL`,
      [hash(body.token)],
    );
    if (!folder.rowCount) throw new ApiError(404, 'INVITE_EXPIRED');
    const id = folder.rows[0].id;
    const rows = await pool().query(`WITH items AS (
      SELECT id,owner_id,'image' AS media_type,true AS has_preview,false AS original_available,recorded_on::timestamptz AS captured_time,body,to_char(recorded_on,'YYYY-MM-DD') AS day,recorded_on::timestamp AS sort_date,'record' AS kind,updated_at,revision,title
       FROM snaproom.records WHERE folder_id=$1 AND NOT safety_hidden
      UNION ALL SELECT id,owner_id,CASE WHEN mime LIKE 'video/%' THEN 'video' ELSE 'image' END,preview_path IS NOT NULL OR NOT original_available,original_available,captured_at,name,to_char(captured_at AT TIME ZONE $2,'YYYY-MM-DD'),captured_at AT TIME ZONE $2,'photo',created_at,0,''
       FROM snaproom.photos p WHERE folder_id=$1 AND NOT safety_hidden
       AND NOT EXISTS(SELECT 1 FROM snaproom.record_photos rp JOIN snaproom.records r ON r.id=rp.record_id WHERE rp.photo_id=p.id AND NOT r.safety_hidden)
    ) SELECT i.*,COALESCE(a.display_name,v.display_name,'') AS author FROM items i LEFT JOIN snaproom.accounts a ON a.viewer_id=i.owner_id JOIN snaproom.viewers v ON v.id=i.owner_id ORDER BY sort_date DESC,id DESC LIMIT 200`,
      [id, timezone]);
    const recordIds = rows.rows.filter(r => r.kind === 'record').map(r => r.id);
    const attachments = recordIds.length ? await pool().query(
      `SELECT rp.record_id,p.*,rp.position FROM snaproom.record_photos rp JOIN snaproom.photos p ON p.id=rp.photo_id
       WHERE rp.record_id=ANY($1::uuid[]) AND p.folder_id=$2 AND NOT p.safety_hidden ORDER BY rp.position`,
      [recordIds, id]) : { rows: [] as { record_id: string; id: string; name: string; mime: string; original_available: boolean; captured_at: Date }[] };
    const token = body.token as string;
    const items = rows.rows.map(r => ({
      id: r.id, kind: r.kind, title: r.title,
      photos: attachments.rows.filter(p => p.record_id === r.id).map(p => ({
        id: p.id, kind: 'photo' as const, body: p.name, src: `/api/photos/${p.id}/content?invite=${token}`,
        mediaType: p.mime.startsWith('video/') ? 'video' : 'image', shared: true, mine: false,
        created: new Date(p.captured_at).getTime(), originalAvailable: p.original_available, audience: 'all', recipients: [],
      })),
      body: r.body, created: new Date(r.captured_time).getTime(), day: r.day, shared: true, audience: 'all', recipients: [],
      mediaType: r.media_type, hasPreview: r.has_preview, originalAvailable: r.original_available, mine: false, author: r.author,
      updatedAt: r.updated_at, revision: r.revision, src: r.kind === 'photo' ? `/api/photos/${r.id}/content?invite=${token}` : undefined,
    }));
    return Response.json({ folderId: id, style: { theme: folder.rows[0].theme || '', song: folder.rows[0].song || '' }, items },
      { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
