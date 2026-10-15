CREATE TABLE IF NOT EXISTS snaproom.growth_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_key text NOT NULL UNIQUE CHECK(length(event_key)<=200),
 event text NOT NULL CHECK(event IN ('organizer_landing_view','organizer_cta_clicked','album_created','invite_created','invite_opened','invite_joined','upload_started','upload_succeeded','upload_failed')),
 viewer_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 context_id uuid,
 environment text NOT NULL CHECK(environment IN ('production','development')),
 properties jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 posthog_sent_at timestamptz,
 delivery_attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS growth_events_date ON snaproom.growth_events(environment,created_at);
CREATE INDEX IF NOT EXISTS growth_events_actor ON snaproom.growth_events(viewer_id,context_id,event,created_at);
CREATE INDEX IF NOT EXISTS growth_events_pending ON snaproom.growth_events(created_at) WHERE posthog_sent_at IS NULL;
ALTER TABLE snaproom.growth_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.growth_events FROM PUBLIC,anon,authenticated;
