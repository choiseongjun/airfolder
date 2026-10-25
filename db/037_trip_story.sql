BEGIN;
ALTER TABLE snaproom.folders ADD COLUMN IF NOT EXISTS story_mode boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS snaproom.trip_story_entries (
 note_id uuid PRIMARY KEY REFERENCES snaproom.rolling_paper_notes(id) ON DELETE CASCADE,
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 30),
 animal text NOT NULL CHECK(animal IN ('cat','dog','otter','rabbit','bear')),
 use_profile boolean NOT NULL DEFAULT false
);
ALTER TABLE snaproom.trip_story_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.trip_story_entries FROM PUBLIC,anon,authenticated;
ALTER TABLE snaproom.growth_events DROP CONSTRAINT IF EXISTS growth_events_event_check;
ALTER TABLE snaproom.growth_events ADD CONSTRAINT growth_events_event_check CHECK(event IN (
 'site_visit','session_started','album_maker_viewed','album_picker_opened','album_photos_selected','album_preview_ready','album_save_started','album_save_failed','album_photo_failed','album_save_completed',
 'photo_request_viewed','photo_request_started','photo_request_link_copied','photo_request_share_opened','photo_request_failed',
 'trip_story_viewed','trip_story_previewed','trip_story_saved','trip_story_contributed','trip_story_exported','trip_story_share_opened','trip_story_invite_copied',
 'login_start','login_failed','login','sign_up','organizer_landing_view','organizer_cta_clicked','album_created','invite_created','invite_opened','invite_joined','upload_started','upload_succeeded','upload_failed'
));
COMMIT;
