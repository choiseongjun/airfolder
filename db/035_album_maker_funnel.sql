BEGIN;
ALTER TABLE snaproom.growth_events DROP CONSTRAINT IF EXISTS growth_events_event_check;
ALTER TABLE snaproom.growth_events ADD CONSTRAINT growth_events_event_check CHECK(event IN (
 'site_visit','session_started','album_maker_viewed','album_picker_opened','album_photos_selected','album_preview_ready','album_save_started','album_save_failed','album_photo_failed','album_save_completed',
 'login_start','login_failed','login','sign_up','organizer_landing_view','organizer_cta_clicked','album_created','invite_created','invite_opened','invite_joined','upload_started','upload_succeeded','upload_failed'
));
CREATE INDEX IF NOT EXISTS growth_events_attempt ON snaproom.growth_events((properties->>'attempt_id'),event) WHERE properties->>'attempt_id' IS NOT NULL;
CREATE INDEX IF NOT EXISTS growth_events_visit ON snaproom.growth_events((properties->>'session_id'),event) WHERE properties->>'session_id' IS NOT NULL;
COMMIT;
