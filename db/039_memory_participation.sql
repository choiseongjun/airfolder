ALTER TABLE snaproom.rolling_paper_notes DROP CONSTRAINT IF EXISTS rolling_paper_notes_body_check;
ALTER TABLE snaproom.rolling_paper_notes ADD CONSTRAINT rolling_paper_notes_body_check CHECK(length(body) BETWEEN 1 AND 1000);
CREATE TABLE IF NOT EXISTS snaproom.web_push_keys (
 id integer PRIMARY KEY CHECK(id=1),public_key text NOT NULL,private_key text NOT NULL
);
CREATE TABLE IF NOT EXISTS snaproom.web_push_subscriptions (
 endpoint text PRIMARY KEY, viewer_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 session_hash text NOT NULL REFERENCES snaproom.sessions(token_hash) ON DELETE CASCADE,
 p256dh text NOT NULL,auth text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE snaproom.web_push_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.web_push_keys,snaproom.web_push_subscriptions FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS web_push_viewer ON snaproom.web_push_subscriptions(viewer_id);
ALTER TABLE snaproom.notifications ADD COLUMN IF NOT EXISTS note_id uuid REFERENCES snaproom.rolling_paper_notes(id) ON DELETE CASCADE;
ALTER TABLE snaproom.notifications ADD COLUMN IF NOT EXISTS web_pushed_at timestamptz;
ALTER TABLE snaproom.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE snaproom.notifications ADD CONSTRAINT notifications_kind_check CHECK(kind IN('photos','comment','like','note'));
CREATE OR REPLACE FUNCTION snaproom.notify_album_note() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO snaproom.notifications(viewer_id,folder_id,note_id,actor_id,kind,event_key)
 SELECT f.owner_id,NEW.folder_id,NEW.id,NEW.owner_id,'note','note:'||NEW.id FROM snaproom.folders f
 WHERE f.id=NEW.folder_id AND f.owner_id<>NEW.owner_id AND f.deleted_at IS NULL
 AND snaproom.interaction_allowed(f.owner_id,NEW.owner_id)
 ON CONFLICT(viewer_id,event_key) DO NOTHING;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS notify_album_note ON snaproom.rolling_paper_notes;
CREATE TRIGGER notify_album_note AFTER INSERT ON snaproom.rolling_paper_notes FOR EACH ROW EXECUTE FUNCTION snaproom.notify_album_note();
-- Extend the existing allowlist without deleting events or changing retention.
DO $$ DECLARE expression text; BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO expression FROM pg_constraint WHERE conrelid='snaproom.growth_events'::regclass AND conname='growth_events_event_check';
 IF expression IS NOT NULL THEN
  ALTER TABLE snaproom.growth_events DROP CONSTRAINT growth_events_event_check;
  EXECUTE 'ALTER TABLE snaproom.growth_events ADD CONSTRAINT growth_events_event_check CHECK (('||expression||') OR event IN (''note_created'',''album_exported'',''notification_opened'',''web_push_enabled'',''premium_interest''))';
 END IF;
END $$;
