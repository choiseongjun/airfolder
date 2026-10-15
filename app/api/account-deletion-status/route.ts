import { ApiError, hash, json, pool, safe, sameOrigin } from '@/lib/server';
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const body = await json(request);
    if (typeof body.receipt !== 'string' || !/^[a-f0-9]{64}$/.test(body.receipt)) throw new ApiError(400, 'INVALID_RECEIPT');
    const result = await pool().query("SELECT requested_at,completed_at FROM snaproom.deletion_receipts WHERE token_hash=$1 AND (completed_at IS NULL OR completed_at>now()-interval '30 days')", [hash(body.receipt)]);
    if (!result.rowCount) throw new ApiError(404, 'RECEIPT_NOT_FOUND');
    return Response.json({ status: result.rows[0].completed_at ? 'completed' : 'pending', requestedAt: result.rows[0].requested_at, completedAt: result.rows[0].completed_at }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
