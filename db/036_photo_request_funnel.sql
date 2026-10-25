BEGIN;
ALTER TABLE snaproom.growth_events DROP CONSTRAINT IF EXISTS growth_events_event_check;
ALTER TABLE snaproom.growth_events ADD CONSTRAINT growth_events_event_check CHECK(event IN (
 'site_visit','session_started','album_maker_viewed','album_picker_opened','album_photos_selected','album_preview_ready','album_save_started','album_save_failed','album_photo_failed','album_save_completed',
 'photo_request_viewed','photo_request_started','photo_request_link_copied','photo_request_share_opened','photo_request_failed',
 'login_start','login_failed','login','sign_up','organizer_landing_view','organizer_cta_clicked','album_created','invite_created','invite_opened','invite_joined','upload_started','upload_succeeded','upload_failed'
));
COMMIT;
