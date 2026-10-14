CREATE TABLE IF NOT EXISTS snaproom.push_devices (
  token text PRIMARY KEY,
  viewer_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
  session_hash text NOT NULL REFERENCES snaproom.sessions(token_hash) ON DELETE CASCADE,
  platform text NOT NULL CHECK(platform IN ('ios','android')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE snaproom.push_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.push_devices FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS snaproom_push_viewer ON snaproom.push_devices(viewer_id);
