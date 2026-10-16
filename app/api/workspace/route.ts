import { pool, safe, viewer } from '@/lib/server';
import { connection } from 'next/server';

export async function GET() {
  await connection();
  return safe(async () => {
    const who = await viewer();
    const [folders, photos, accounts] = await Promise.all([
      pool().query(`SELECT f.*, to_char(f.starts_on, 'YYYY-MM-DD') start_date, to_char(f.ends_on, 'YYYY-MM-DD') end_date, (SELECT count(*)::int FROM snaproom.members m WHERE m.folder_id=f.id) members
        FROM snaproom.folders f JOIN snaproom.members m ON m.folder_id=f.id WHERE f.deleted_at IS NULL AND m.viewer_id=$1 ORDER BY f.updated_at DESC`, [who]),
      pool().query(`SELECT p.id,p.folder_id,p.name,p.owner_id,p.shared,p.recipients,p.mime,p.original_available,p.preview_path,p.captured_at FROM snaproom.photos p
        JOIN snaproom.members m ON m.folder_id=p.folder_id AND m.viewer_id=$1
        WHERE snaproom.album_active(p.folder_id) AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$1) ORDER BY p.captured_at DESC LIMIT 2000`, [who]),
      pool().query('SELECT display_name AS name, email, provider FROM snaproom.accounts WHERE viewer_id=$1',[who]),
    ]);
    const mapped = photos.rows.map(p => ({ id: p.id, roomId: p.folder_id, name: p.name, shared: p.shared, audience: !p.shared?'private':p.recipients.length?'selected':'all', recipients: p.owner_id===who?p.recipients:[], mediaType: p.mime.startsWith('video/')?'video':'image', mime: p.mime, originalAvailable: p.original_available, hasPreview: Boolean(p.preview_path)||!p.original_available, mine: p.owner_id === who, created: new Date(p.captured_at).getTime(), src: `/api/photos/${p.id}/content`, uploadStatus: 'uploaded' }));
    return Response.json({ viewerId: who, account: accounts.rows[0] || null, rooms: folders.rows.map(f => ({ id: f.id, groupId:f.group_id, name: f.name, category: f.category, description: f.description, startDate: f.start_date, endDate: f.end_date, mine: f.owner_id === who, members: f.members, count: mapped.filter(p => p.roomId === f.id).length, image: mapped.find(p => p.roomId === f.id && p.mediaType==='image')?.src || '', color: '#eee5d6', updated: '', updatedAt: new Date(f.updated_at).getTime() })), photos: mapped }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
