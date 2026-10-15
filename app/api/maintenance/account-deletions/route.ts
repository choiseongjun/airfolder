import { timingSafeEqual } from 'node:crypto';
import { deletionConfiguration, runAccountDeletions } from '@/lib/account-deletions';
import { adminSafe } from '@/lib/admin';

export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret || ''}`);
  if (!secret || secret.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  return adminSafe(async () => {
    const result = await runAccountDeletions(null);
    const configured = deletionConfiguration().firebase;
    return Response.json({ ...result, firebaseConfigured: configured }, { status: result.failed || result.pending || !configured ? 503 : 200 });
  });
}
