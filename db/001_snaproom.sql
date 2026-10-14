-- Isolated application schema. No recommand-menu tables or auth settings are modified.
CREATE SCHEMA IF NOT EXISTS snaproom;
REVOKE ALL ON SCHEMA snaproom FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS snaproom.viewers (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS snaproom.sessions (
  token_hash text PRIMARY KEY,
  viewer_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS snaproom.folders (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES snaproom.viewers(id),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  category text NOT NULL DEFAULT '개인',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS snaproom.members (
  folder_id uuid NOT NULL REFERENCES snaproom.folders(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(folder_id, viewer_id)
);
CREATE TABLE IF NOT EXISTS snaproom.photos (
  id uuid PRIMARY KEY,
  folder_id uuid NOT NULL REFERENCES snaproom.folders(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES snaproom.viewers(id),
  name text NOT NULL,
  object_path text NOT NULL UNIQUE,
  mime text NOT NULL DEFAULT 'image/jpeg',
  size_bytes bigint NOT NULL,
  shared boolean NOT NULL DEFAULT false,
  captured_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS snaproom.invites (
  token_hash text PRIMARY KEY,
  folder_id uuid NOT NULL REFERENCES snaproom.folders(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES snaproom.viewers(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS snaproom_members_viewer ON snaproom.members(viewer_id);
CREATE INDEX IF NOT EXISTS snaproom_photos_folder_date ON snaproom.photos(folder_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS snaproom_photos_owner ON snaproom.photos(owner_id);
ALTER TABLE snaproom.viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA snaproom FROM PUBLIC, anon, authenticated;
-- No public Data API policies: all requests pass through the authenticated Next.js API.
