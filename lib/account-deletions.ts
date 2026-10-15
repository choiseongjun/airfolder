import 'server-only';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { ApiError, pool, storage } from './server';
import { deleteRequestedAccount } from '@/scripts/account-deletion-core.mjs';

export function deletionAuth() {
  const value = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!value || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  const credential = JSON.parse(value);
  if (!credential.project_id || credential.project_id !== process.env.FIREBASE_PROJECT_ID || credential.project_id !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  const name = 'snaproom-deletions-' + credential.project_id;
  const app = getApps().find(a => a.name === name) || initializeApp({ credential: cert(credential) }, name);
  return getAuth(app);
}
export function deletionConfiguration() {
  let firebase = false;
  try { deletionAuth(); firebase = true; } catch { /* Never return credential details. */ }
  return { firebase, storage: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY, scheduleSecret: (process.env.CRON_SECRET?.length || 0) >= 32 };
}
export async function runAccountDeletions(adminId: string | null, viewerId?: string) {
  const db = await pool().connect();
  let locked = false;
  try {
    locked = (await db.query("SELECT pg_try_advisory_lock(hashtext('snaproom-deletion-worker')) AS locked")).rows[0].locked;
    if (!locked) throw new ApiError(409, 'DELETION_ALREADY_RUNNING');
    const jobs = await db.query(`SELECT v.id,a.firebase_uid FROM snaproom.viewers v LEFT JOIN snaproom.accounts a ON a.viewer_id=v.id WHERE v.deletion_requested_at<now()-interval '5 minutes' ${viewerId ? 'AND v.id=$1' : ''} ORDER BY v.deletion_requested_at LIMIT 10`, viewerId ? [viewerId] : []);
    if (viewerId && !jobs.rowCount) throw new ApiError(409, 'DELETION_NOT_READY');
    const deadline = Date.now() + 240000;
    let completed = 0, failed = 0;
    for (const job of jobs.rows) {
      if (Date.now() >= deadline) break;
      try {
        // Validate the Firebase dependency before deleting even one stored file.
        let auth;
        if (job.firebase_uid) { try { auth = deletionAuth(); } catch { /* The shared core records a safe configuration error. */ } }
        if (await deleteRequestedAccount(db, storage(), auth, job.id, { adminId })) completed++;
      } catch {
        failed++;
      }
    }
    await db.query("DELETE FROM snaproom.deletion_receipts WHERE completed_at<now()-interval '30 days'");
    await db.query("DELETE FROM snaproom.admin_audit WHERE created_at<now()-interval '30 days'");
    await db.query('DELETE FROM snaproom.admin_sessions WHERE expires_at<now()');
    await db.query('DELETE FROM snaproom.admin_login_limits WHERE expires_at<now()');
    const pending = await db.query('SELECT count(*)::int AS count FROM snaproom.viewers WHERE deletion_requested_at IS NOT NULL');
    return { completed, failed, pending: pending.rows[0].count };
  } finally {
    if (locked) await db.query("SELECT pg_advisory_unlock(hashtext('snaproom-deletion-worker'))");
    db.release();
  }
}
