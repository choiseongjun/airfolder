import 'server-only';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { hash, pool } from './server';
import { growthProperties, type GrowthEvent } from './growth-events';
import { attributionFromCookie } from './acquisition';
import { sessionFromCookie } from './visit-session';

export const growthEnvironment = () => process.env.ANALYTICS_ENVIRONMENT === 'production' ? 'production' : 'development';
export type GrowthInput = { event: GrowthEvent; who: string; key: string; contextId?: string; properties?: Record<string, unknown> };
export function trackGrowth(input: GrowthInput) {
  // Analytics must never turn a successful upload or join into a failed user action.
  after(async () => {
    try {
      const requestHeaders = await headers();
      if (requestHeaders.get('dnt') === '1' || requestHeaders.get('sec-gpc') === '1') return;
      const attribution = attributionFromCookie(requestHeaders.get('cookie') || '');
      const session = sessionFromCookie(requestHeaders.get('cookie') || '');
      const environment = session?.session_source === 'qa' ? 'development' : growthEnvironment();
      if (session) await pool().query(`INSERT INTO snaproom.growth_events(event_key,event,viewer_id,environment,properties,created_at)
        VALUES($1,'session_started',$2,$3,$4,$5) ON CONFLICT(event_key) DO NOTHING`,
        [`session:${session.session_id}`, input.who, environment, growthProperties(session), new Date(session.started_at)]);
      if (attribution) await pool().query(`INSERT INTO snaproom.growth_events(event_key,event,viewer_id,environment,properties,created_at)
        VALUES($1,'site_visit',$2,$3,$4,$5) ON CONFLICT(event_key) DO UPDATE SET properties=EXCLUDED.properties,
        created_at=LEAST(growth_events.created_at,EXCLUDED.created_at) WHERE growth_events.properties->>'journey_id' IS NULL`,
        [`visit:${attribution.journey_id}`, input.who, environment, growthProperties(attribution), new Date(attribution.acquired_at)]);
      await pool().query(`INSERT INTO snaproom.growth_events(event_key,event,viewer_id,context_id,environment,properties)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(event_key) DO NOTHING`,
      [input.key, input.event, input.who, input.contextId || null, environment, growthProperties({ ...input.properties, ...attribution, ...session })]);
      await flushGrowth();
    } catch { console.error('Growth analytics unavailable'); }
  });
}

export function posthogConfigured() {
  return Boolean(process.env.POSTHOG_PROJECT_API_KEY && ['https://us.i.posthog.com', 'https://eu.i.posthog.com'].includes(process.env.POSTHOG_HOST || ''));
}

export async function flushGrowth() {
  if (!posthogConfigured()) return;
  // A small transactional outbox keeps failed deliveries for retry without resending a whole backlog.
  const db = await pool().connect();
  try {
    await db.query('BEGIN');
    const rows = await db.query(`SELECT * FROM snaproom.growth_events WHERE posthog_sent_at IS NULL
      AND environment='production' AND delivery_attempts<20 AND created_at>now()-interval '90 days'
      ORDER BY created_at LIMIT 50 FOR UPDATE SKIP LOCKED`);
    if (rows.rowCount) {
      const batch = rows.rows.map(row => ({ event: row.event, timestamp: new Date(row.created_at).toISOString(), distinct_id: hash('memolumi-growth:' + row.viewer_id), properties: {
        ...growthProperties(row.properties),
        $insert_id: row.id, $process_person_profile: false, $geoip_disable: true,
        environment: row.environment, ...(row.context_id ? { context_id: hash('memolumi-context:' + row.context_id) } : {}),
      } }));
      const ids = rows.rows.map(row => row.id);
      await db.query('UPDATE snaproom.growth_events SET delivery_attempts=delivery_attempts+1 WHERE id=ANY($1::uuid[])', [ids]);
      try {
        const response = await fetch(process.env.POSTHOG_HOST + '/batch/', { method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: process.env.POSTHOG_PROJECT_API_KEY, batch }), signal: AbortSignal.timeout(4000) });
        if (response.ok) await db.query('UPDATE snaproom.growth_events SET posthog_sent_at=now() WHERE id=ANY($1::uuid[])', [ids]);
      } catch { /* Retain unsent events; the next event or maintenance run retries them. */ }
    }
    await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK').catch(() => {}); throw error; }
  finally { db.release(); }
}
