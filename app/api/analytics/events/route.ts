import { clientEvents, type ClientGrowthEvent } from '@/lib/growth-events';
import { trackGrowth } from '@/lib/growth';
import { ApiError, json, pool, requireMember, safe, sameOrigin, uuid, viewer } from '@/lib/server';

export async function POST(request: Request) { return safe(async () => {
  sameOrigin(request);
  const who = await viewer(), body = await json(request), id = uuid(body.id);
  if (!clientEvents.includes(body.event)) throw new ApiError(400, 'INVALID_EVENT');
  const event = body.event as ClientGrowthEvent;
  const contextId = event.startsWith('upload_') || ['photo_request_link_copied','photo_request_share_opened','trip_story_exported','trip_story_share_opened','trip_story_invite_copied'].includes(event) ? uuid(body.contextId) : undefined;
  if (contextId) await requireMember(contextId, who);
  const count = await pool().query("SELECT count(*)::int n FROM snaproom.growth_events WHERE viewer_id=$1 AND created_at>now()-interval '1 minute'", [who]);
  if (count.rows[0].n >= 120) throw new ApiError(429, 'TOO_MANY_EVENTS');
  trackGrowth({ event, who, key: event === 'site_visit' ? `visit:${id}` : event === 'session_started' ? `session:${id}` : `client:${who}:${id}`, contextId,
    properties: body.properties && typeof body.properties === 'object' ? body.properties : {} });
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}); }
