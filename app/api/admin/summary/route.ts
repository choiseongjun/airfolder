import { pool } from '@/lib/server';
import { adminSafe, requireAdmin } from '@/lib/admin';
import { deletionConfiguration } from '@/lib/account-deletions';
import { serviceStorageHealth } from '@/lib/storage-quota';

export async function GET() { return adminSafe(async () => {
  await requireAdmin();
  const result = await pool().query(`SELECT
    (SELECT count(*)::int FROM snaproom.safety_reports WHERE status='open') AS reports,
    (SELECT count(*)::int FROM snaproom.viewers WHERE deletion_requested_at IS NOT NULL) AS deletions,
    (SELECT count(*)::int FROM snaproom.viewers WHERE deletion_requested_at<now()-interval '30 days') AS overdue,
    (SELECT count(*)::int FROM snaproom.viewers WHERE deletion_last_error IS NOT NULL AND deletion_requested_at IS NOT NULL) AS failed,
    (SELECT count(*)::int FROM snaproom.viewers WHERE suspended_at IS NOT NULL AND deletion_requested_at IS NULL) AS suspended,
    (SELECT count(*)::int FROM snaproom.admin_audit WHERE action='deletion_completed' AND created_at>=now()-interval '30 days') AS completed`);
  return Response.json({ counts: result.rows[0], configuration: deletionConfiguration(), storage: await serviceStorageHealth() }, { headers: { 'Cache-Control': 'private, no-store' } });
}); }
