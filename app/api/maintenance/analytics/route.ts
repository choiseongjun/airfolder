import { timingSafeEqual } from 'node:crypto';
import { flushGrowth } from '@/lib/growth';
import { pool, safe } from '@/lib/server';
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get('authorization') || ''), expected = Buffer.from(`Bearer ${secret || ''}`);
  if (!secret || secret.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  return safe(async () => {
    const removed = await pool().query("DELETE FROM snaproom.growth_events WHERE created_at<now()-interval '90 days'");
    for (let i=0; i<5; i++) await flushGrowth();
    return Response.json({ removed: removed.rowCount }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
