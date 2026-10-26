import { ApiError, pool, safe, uuid, viewer } from '@/lib/server';
import { WORKSPACE_PAGE_SIZE } from '@/lib/workspace-pagination';
import { connection } from 'next/server';

export async function GET(request: Request) {
  await connection();
  return safe(async () => {
    const who = await viewer();
    const cursor = new URL(request.url).searchParams.get('cursor');
    let before: string | null = null, beforeId: string | null = null;
    if (cursor) {
      try {
        if (cursor.length > 256 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw Error();
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        if (typeof decoded.at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(decoded.at) || !Number.isFinite(Date.parse(decoded.at))) throw Error();
        before = decoded.at; beforeId = uuid(decoded.id);
      } catch { throw new ApiError(400, 'INVALID_CURSOR'); }
    }
    await pool().query('SELECT snaproom.reveal_due_capsules($1)', [who]);
    const [folders, photos, accounts] = await Promise.all([
      pool().query(`SELECT f.*, to_char(f.starts_on, 'YYYY-MM-DD') start_date, to_char(f.ends_on, 'YYYY-MM-DD') end_date, (SELECT count(*)::int FROM snaproom.members m WHERE m.folder_id=f.id) members,
        (SELECT count(*)::int FROM snaproom.photos h WHERE h.folder_id=f.id AND h.deleted_at IS NULL AND h.capsule_hold) held, (SELECT count(DISTINCT h.owner_id)::int FROM snaproom.photos h WHERE h.folder_id=f.id AND h.deleted_at IS NULL AND h.capsule_hold) held_people,
        (SELECT count(*)::int FROM snaproom.photos p WHERE p.folder_id=f.id AND p.deleted_at IS NULL AND snaproom.album_active(p.folder_id) AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$1)) photo_count,
        (SELECT p.id FROM snaproom.photos p WHERE p.folder_id=f.id AND p.deleted_at IS NULL AND snaproom.album_active(p.folder_id) AND p.mime LIKE 'image/%' AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$1) ORDER BY CASE WHEN p.name='memory-book-01.jpg' THEN 0 ELSE 1 END,p.captured_at DESC,p.id DESC LIMIT 1) cover_id
        FROM snaproom.folders f JOIN snaproom.members m ON m.folder_id=f.id WHERE f.deleted_at IS NULL AND m.viewer_id=$1 ORDER BY f.updated_at DESC`, [who]),
      pool().query(`SELECT p.id,p.folder_id,p.name,p.owner_id,p.shared,p.recipients,p.mime,p.original_available,p.preview_path,p.captured_at,p.capsule_hold,
        to_char(p.captured_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') cursor_at FROM snaproom.photos p
        JOIN snaproom.members m ON m.folder_id=p.folder_id AND m.viewer_id=$1
        WHERE p.deleted_at IS NULL AND snaproom.album_active(p.folder_id) AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$1)
          AND ($2::timestamptz IS NULL OR (p.captured_at,p.id)<($2::timestamptz,$3::uuid))
        ORDER BY p.captured_at DESC,p.id DESC LIMIT $4`, [who, before, beforeId, WORKSPACE_PAGE_SIZE + 1]),
      pool().query('SELECT display_name AS name, email, provider FROM snaproom.accounts WHERE viewer_id=$1',[who]),
    ]);
    const page = photos.rows.slice(0, WORKSPACE_PAGE_SIZE), last = page.at(-1);
    const nextCursor = photos.rows.length > WORKSPACE_PAGE_SIZE && last ? Buffer.from(JSON.stringify({ at: last.cursor_at, id: last.id })).toString('base64url') : null;
    const mapped = page.map(p => ({ id: p.id, roomId: p.folder_id, name: p.name, shared: p.shared||p.capsule_hold, audience: !(p.shared||p.capsule_hold)?'private':p.recipients.length?'selected':'all', recipients: p.owner_id===who?p.recipients:[], mediaType: p.mime.startsWith('video/')?'video':'image', mime: p.mime, originalAvailable: p.original_available, hasPreview: Boolean(p.preview_path)||!p.original_available, mine: p.owner_id === who, created: new Date(p.captured_at).getTime(), src: `/api/photos/${p.id}/content`, uploadStatus: 'uploaded' }));
    return Response.json({ viewerId: who, account: accounts.rows[0] || null, rooms: folders.rows.map(f => ({ id: f.id, groupId:f.group_id, name: f.name, category: f.category, description: f.description, startDate: f.start_date, endDate: f.end_date, mine: f.owner_id === who, members: f.members, count: f.photo_count, image: f.cover_id ? `/api/photos/${f.cover_id}/content` : '', color: '#eee5d6', updated: '', updatedAt: new Date(f.updated_at).getTime(), theme: f.theme || '', song: f.song, revealAt: f.reveal_at ? new Date(f.reveal_at).toISOString() : '', held: f.held, heldPeople: f.held_people })), photos: mapped, nextCursor }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
