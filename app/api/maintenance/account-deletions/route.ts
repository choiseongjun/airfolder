import { timingSafeEqual } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { pool, storage } from '@/lib/server';
import { deleteRequestedAccount } from '@/scripts/account-deletion-core.mjs';

export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret || ''}`);
  if (!secret || secret.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return Response.json({ error: 'DELETION_NOT_CONFIGURED' }, { status: 503 });
  let db;
  try {
    const credential = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (!credential.project_id || credential.project_id !== process.env.FIREBASE_PROJECT_ID) throw new Error('Project mismatch');
    const app = getApps().find(a => a.name === 'snaproom-deletions') || initializeApp({ credential: cert(credential) }, 'snaproom-deletions');
    const auth = getAuth(app), store = storage(), deadline = Date.now() + 240000;
    db = await pool().connect();
    const jobs = await db.query("SELECT id FROM snaproom.viewers WHERE deletion_requested_at<now()-interval '5 minutes' ORDER BY deletion_requested_at LIMIT 50");
    let completed = 0, failed = 0;
    for (const job of jobs.rows) {
      if (Date.now() >= deadline) break;
      try { if (await deleteRequestedAccount(db, store, auth, job.id)) completed++; }
      catch { failed++; }
    }
    await db.query("DELETE FROM snaproom.deletion_receipts WHERE completed_at<now()-interval '30 days'");
    const pending = await db.query('SELECT count(*)::int AS count FROM snaproom.viewers WHERE deletion_requested_at IS NOT NULL');
    // Alert on non-200 runs, including remaining work, instead of silently claiming success.
    return Response.json({ completed, failed, pending: pending.rows[0].count }, { status: failed || pending.rows[0].count ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'DELETION_WORKER_FAILED' }, { status: 503 }); }
  finally { db?.release(); }
}
