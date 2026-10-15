import { connection } from 'next/server';
import { ApiError, json, pool, safe, sameOrigin, viewer } from '@/lib/server';
import { TERMS_VERSION } from '@/lib/policy';

export async function GET() {
  await connection();
  return safe(async () => {
    const who = await viewer();
    const result = await pool().query('SELECT terms_version FROM snaproom.viewers WHERE id=$1', [who]);
    return Response.json({ version: TERMS_VERSION, accepted: result.rows[0]?.terms_version === TERMS_VERSION }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const who = await viewer(), body = await json(request);
    if (body.version !== TERMS_VERSION || body.accepted !== true) throw new ApiError(400, 'CONSENT_REQUIRED');
    await pool().query('UPDATE snaproom.viewers SET terms_version=$2,terms_accepted_at=now() WHERE id=$1', [who, TERMS_VERSION]);
    return Response.json({ accepted: true });
  });
}
