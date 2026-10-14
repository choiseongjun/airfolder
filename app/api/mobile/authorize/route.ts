import { randomBytes } from 'node:crypto';
import { ApiError, hash, json, pool, safe, transaction, viewer } from '@/lib/server';
import { hex64Pattern } from '@/lib/mobile-auth-core';
export async function POST(request: Request) {
  return safe(async () => {
    if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.has('authorization')) throw new ApiError(403, 'INVALID_ORIGIN');
    const who = await viewer(), body = await json(request);
    if (typeof body.challenge !== 'string' || !hex64Pattern.test(body.challenge)) throw new ApiError(400, 'INVALID_CHALLENGE');
    const account = await pool().query('SELECT 1 FROM snaproom.accounts WHERE viewer_id=$1', [who]);
    if (!account.rowCount) throw new ApiError(403, 'ACCOUNT_REQUIRED');
    const code = randomBytes(32).toString('hex');
    await transaction(async db => {
      await db.query('SELECT id FROM snaproom.viewers WHERE id=$1 FOR UPDATE', [who]);
      await db.query('DELETE FROM snaproom.mobile_login_codes WHERE viewer_id=$1 OR expires_at<now()', [who]);
      await db.query("INSERT INTO snaproom.mobile_login_codes(code_hash,viewer_id,challenge,expires_at) VALUES($1,$2,$3,now()+interval '5 minutes')", [hash(code), who, body.challenge]);
    });
    return Response.json({ code }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  });
}
