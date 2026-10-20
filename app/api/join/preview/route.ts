import { trackGrowth } from '@/lib/growth';
import { ApiError, hash, json, pool, safe, sameOrigin, viewer } from '@/lib/server';

export async function POST(request: Request) { return safe(async () => {
  sameOrigin(request);
  const who = await viewer(), body = await json(request);
  if (typeof body.token !== 'string' || !/^[a-f\d]{64}$/.test(body.token)) throw new ApiError(400, 'INVALID_INVITE');
  // Counts match what an invite holder can actually preview.
  const result = await pool().query(`SELECT f.id,f.name,'album' AS kind,i.expires_at,f.owner_id=$2 AS owner,f.category,to_char(f.ends_on,'YYYY-MM-DD') AS day,
      (SELECT count(*)::int FROM snaproom.photos p WHERE p.folder_id=f.id AND p.deleted_at IS NULL AND NOT p.safety_hidden AND p.shared AND cardinality(p.recipients)=0 AND NOT p.capsule_hold) AS photos,
      (SELECT count(DISTINCT p.owner_id)::int FROM snaproom.photos p WHERE p.folder_id=f.id AND p.deleted_at IS NULL AND NOT p.safety_hidden AND p.shared AND cardinality(p.recipients)=0 AND NOT p.capsule_hold) AS people
    FROM snaproom.invites i JOIN snaproom.folders f ON f.id=i.folder_id AND f.deleted_at IS NULL
    WHERE i.token_hash=$1 AND i.expires_at>now() AND f.group_id IS NULL
    UNION ALL SELECT g.id,g.name,'group' AS kind,i.expires_at,g.owner_id=$2 AS owner,NULL,NULL,NULL,NULL
    FROM snaproom.group_invites i JOIN snaproom.groups g ON g.id=i.group_id
    WHERE i.token_hash=$1 AND i.expires_at>now()`, [hash(body.token), who]);
  const invite = result.rows[0];
  if (!invite) throw new ApiError(404, 'INVITE_EXPIRED');
  if (!invite.owner) trackGrowth({ event: 'invite_opened', who, contextId: invite.id,
    key: `invite_opened:${who}:${invite.id}:${new Date().toISOString().slice(0, 10)}`,
    properties: { source: 'guest', invite_type: invite.kind } });
  return Response.json({ name: invite.name, kind: invite.kind, expiresAt: invite.expires_at, birthday: invite.category === '생일', day: invite.day, photos: invite.photos, people: invite.people },
    { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
}); }
