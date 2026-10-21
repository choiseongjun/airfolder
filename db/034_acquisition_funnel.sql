ALTER TABLE snaproom.growth_events DROP CONSTRAINT IF EXISTS growth_events_event_check;
ALTER TABLE snaproom.growth_events ADD CONSTRAINT growth_events_event_check CHECK(event IN ('site_visit','login_start','login_failed','login','sign_up','organizer_landing_view','organizer_cta_clicked','album_created','invite_created','invite_opened','invite_joined','upload_started','upload_succeeded','upload_failed'));
CREATE INDEX IF NOT EXISTS growth_events_journey ON snaproom.growth_events((properties->>'journey_id'),event,created_at);
