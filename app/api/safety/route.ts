import { randomUUID } from 'node:crypto';
import { connection } from 'next/server';
import { ApiError, json, pool, safe, sameOrigin, transaction, uuid, viewer } from '@/lib/server';
import { safetyTarget } from '@/lib/safety';
import { textBody } from '@/lib/memories';

export async function GET() {
  await connection();
  return safe(async () => {
    const who = await viewer();
    const result = await pool().query(`SELECT b.blocked_id AS id,COALESCE(a.display_name,v.display_name,'Member') AS name FROM snaproom.user_blocks b JOIN snaproom.viewers v ON v.id=b.blocked_id LEFT JOIN snaproom.accounts a ON a.viewer_id=b.blocked_id WHERE b.owner_id=$1 ORDER BY b.created_at DESC`, [who]);
    return Response.json({ blocked: result.rows }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const who = await viewer(), body = await json(request);
    if (body.action !== 'report' && body.action !== 'block') throw new ApiError(400, 'INVALID_ACTION');
    await transaction(async db => {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['safety:' + who]);
      const target = await safetyTarget(db, who, body.kind, body.targetId);
      if (target.owner === who) throw new ApiError(400, 'OWN_CONTENT');
      if (body.action === 'block') {
        await db.query('INSERT INTO snaproom.user_blocks(owner_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [who, target.owner]);
      } else {
        const reason = textBody(body.reason, 1000);
        const count = await db.query("SELECT count(*) FROM snaproom.safety_reports WHERE reporter_id=$1 AND created_at>now()-interval '1 hour'", [who]);
        if (Number(count.rows[0].count) >= 30) throw new ApiError(429, 'RATE_LIMITED');
        await db.query(`INSERT INTO snaproom.safety_reports(id,reporter_id,${target.column},reason) VALUES($1,$2,$3,$4) ON CONFLICT(reporter_id,${target.column}) DO UPDATE SET reason=excluded.reason,status='open',resolved_at=NULL`, [randomUUID(), who, target.id, reason]);
      }
    });
    return Response.json({ ok: true });
  });
}
export async function DELETE(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const who = await viewer(), body = await json(request);
    await pool().query('DELETE FROM snaproom.user_blocks WHERE owner_id=$1 AND blocked_id=$2', [who, uuid(body.id)]);
    return Response.json({ ok: true });
  });
}
