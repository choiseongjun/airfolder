import { ApiError, json, uuid } from '@/lib/server';
import { adminOrigin, adminSafe, requireAdmin } from '@/lib/admin';
import { runAccountDeletions } from '@/lib/account-deletions';

export const maxDuration = 300;
export async function POST(request: Request) { return adminSafe(async () => {
  adminOrigin(request);
  const admin = await requireAdmin(), body = await json(request);
  if (body.confirm !== 'PROCESS_REQUESTED_DELETIONS') throw new ApiError(400, 'CONFIRM_DELETION');
  const result = await runAccountDeletions(admin.id, body.id === undefined ? undefined : uuid(body.id));
  return Response.json(result, { status: result.failed ? 503 : 200 });
}); }
