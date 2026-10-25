import { timingSafeEqual } from 'node:crypto';
import { flushGrowth } from '@/lib/growth';
import { pool, safe } from '@/lib/server';
import { cleanupCharacterDrafts } from '@/lib/character-maintenance';
import { serviceStorageHealth } from '@/lib/storage-quota';
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get('authorization') || ''), expected = Buffer.from(`Bearer ${secret || ''}`);
  if (!secret || secret.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  return safe(async () => {
    const expiredCharacterDrafts = await cleanupCharacterDrafts();
    const storage = await serviceStorageHealth();
    if (storage.level !== 'normal') console.warn('Service storage capacity warning', { level: storage.level, percent: storage.percent });
    const removed = await pool().query("DELETE FROM snaproom.growth_events WHERE created_at<now()-interval '90 days'");
    for (let i=0; i<5; i++) await flushGrowth();
    return Response.json({ removed: removed.rowCount, expiredCharacterDrafts, storage }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}
