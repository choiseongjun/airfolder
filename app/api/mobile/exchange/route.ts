import { randomBytes } from 'node:crypto';
import { ApiError, hash, json, safe, transaction } from '@/lib/server';
import { hex64Pattern, verifierChallenge } from '@/lib/mobile-auth-core';
export async function POST(request: Request) {
  return safe(async () => {
    if (request.headers.has('origin')) throw new ApiError(403, 'NATIVE_ONLY');
    const body = await json(request);
    if (typeof body.code !== 'string' || !hex64Pattern.test(body.code)) throw new ApiError(400, 'INVALID_CODE');
    let challenge: string;
    try { challenge = verifierChallenge(body.verifier); } catch { throw new ApiError(400, 'INVALID_VERIFIER'); }
    const token = 'snm_' + randomBytes(32).toString('hex');
    const viewerId = await transaction(async db => {
      const grant = await db.query('DELETE FROM snaproom.mobile_login_codes WHERE code_hash=$1 AND challenge=$2 AND expires_at>now() RETURNING viewer_id', [hash(body.code), challenge]);
      if (!grant.rowCount) throw new ApiError(401, 'INVALID_OR_EXPIRED_CODE');
      const who = grant.rows[0].viewer_id;
      await db.query("INSERT INTO snaproom.sessions(token_hash,viewer_id,expires_at) VALUES($1,$2,now()+interval '30 days')", [hash(token), who]);
      return who;
    });
    return Response.json({ token, viewerId, expiresAt: Date.now() + 2592000000 }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
