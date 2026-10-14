import { ensureSession, safe, sameOrigin } from '@/lib/server';

export async function POST(request: Request) {
  return safe(async () => { sameOrigin(request); const viewerId = await ensureSession(request); return Response.json({ viewerId }, { headers: { 'Cache-Control': 'no-store' } }); });
}
