import { connection } from 'next/server';
import { pool, requireMember, safe, uuid, viewer } from '@/lib/server';
export async function GET(request: Request) {
  await connection();
  return safe(async () => {
    const who = await viewer(), folder = uuid(new URL(request.url).searchParams.get('folderId'));
    await requireMember(folder, who);
    const result = await pool().query(`SELECT m.viewer_id AS id,COALESCE(NULLIF(a.display_name,''),v.display_name,'Member ' || left(m.viewer_id::text,6)) AS name,m.joined_at,a.viewer_id IS NOT NULL registered,COALESCE(g.owner_id,f.owner_id)=m.viewer_id owner
      FROM snaproom.members m JOIN snaproom.viewers v ON v.id=m.viewer_id JOIN snaproom.folders f ON f.id=m.folder_id LEFT JOIN snaproom.groups g ON g.id=f.group_id LEFT JOIN snaproom.accounts a ON a.viewer_id=m.viewer_id
      WHERE m.folder_id=$1 ORDER BY m.joined_at,m.viewer_id`, [folder]);
    const invites=await pool().query(`SELECT i.expires_at FROM snaproom.invites i JOIN snaproom.folders f ON f.id=i.folder_id WHERE f.id=$1 AND f.owner_id=$2 AND f.group_id IS NULL AND i.expires_at>now() UNION ALL SELECT i.expires_at FROM snaproom.group_invites i JOIN snaproom.groups g ON g.id=i.group_id JOIN snaproom.folders f ON f.group_id=g.id WHERE f.id=$1 AND g.owner_id=$2 AND i.expires_at>now()`,[folder,who]);
    return Response.json({ members: result.rows.map(m => ({ ...m, mine: m.id === who })),invites:invites.rows }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
