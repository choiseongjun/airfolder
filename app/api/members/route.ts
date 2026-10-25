import { connection } from 'next/server';
import { pool, requireMember, safe, uuid, viewer } from '@/lib/server';
export async function GET(request: Request) {
  await connection();
  return safe(async () => {
    const who = await viewer(), folder = uuid(new URL(request.url).searchParams.get('folderId'));
    await requireMember(folder, who);
    const access = await pool().query(`SELECT f.owner_id=$2 AS can_edit,COALESCE(g.owner_id,f.owner_id)=$2 AS can_invite,
      f.description,f.theme,f.song,f.reveal_at,f.story_mode,to_char(f.ends_on,'YYYY-MM-DD') end_date,
      (SELECT count(*)::int FROM snaproom.photos p WHERE p.folder_id=f.id AND p.deleted_at IS NULL AND p.capsule_hold) held,
      (SELECT count(DISTINCT p.owner_id)::int FROM snaproom.photos p WHERE p.folder_id=f.id AND p.deleted_at IS NULL AND p.capsule_hold) held_people
      FROM snaproom.folders f LEFT JOIN snaproom.groups g ON g.id=f.group_id WHERE f.id=$1`, [folder, who]);
    const result = await pool().query(`SELECT m.viewer_id AS id,COALESCE(NULLIF(a.display_name,''),v.display_name,'Member ' || left(m.viewer_id::text,6)) AS name,m.joined_at,a.viewer_id IS NOT NULL registered,COALESCE(g.owner_id,f.owner_id)=m.viewer_id owner,
      EXISTS(SELECT 1 FROM snaproom.photos p WHERE p.folder_id=m.folder_id AND p.owner_id=m.viewer_id AND p.deleted_at IS NULL AND p.shared AND NOT p.capsule_hold AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$2)) AS contributed
      FROM snaproom.members m JOIN snaproom.viewers v ON v.id=m.viewer_id JOIN snaproom.folders f ON f.id=m.folder_id LEFT JOIN snaproom.groups g ON g.id=f.group_id LEFT JOIN snaproom.accounts a ON a.viewer_id=m.viewer_id
      WHERE m.folder_id=$1 ORDER BY m.joined_at,m.viewer_id`, [folder,who]);
    const invites=await pool().query(`SELECT i.expires_at FROM snaproom.invites i JOIN snaproom.folders f ON f.id=i.folder_id WHERE f.id=$1 AND f.owner_id=$2 AND f.group_id IS NULL AND i.expires_at>now() UNION ALL SELECT i.expires_at FROM snaproom.group_invites i JOIN snaproom.groups g ON g.id=i.group_id JOIN snaproom.folders f ON f.group_id=g.id WHERE f.id=$1 AND g.owner_id=$2 AND i.expires_at>now()`,[folder,who]);
    const album=access.rows[0];
    return Response.json({ members: result.rows.map(m => ({ ...m, mine: m.id === who })),invites:invites.rows,canEdit:album?.can_edit===true,canInvite:album?.can_invite===true,
      album:{story:album?.story_mode===true,description:album?.description||'',endDate:album?.end_date||'',style:{theme:album?.theme||'',song:album?.song||'',revealAt:album?.reveal_at?new Date(album.reveal_at).toISOString():'',held:album?.held||0,heldPeople:album?.held_people||0}}
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
