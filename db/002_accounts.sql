CREATE TABLE IF NOT EXISTS snaproom.accounts (
  firebase_uid text PRIMARY KEY,
  viewer_id uuid NOT NULL UNIQUE REFERENCES snaproom.viewers(id),
  provider text NOT NULL CHECK(provider IN ('google.com','apple.com')),
  email text,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE snaproom.accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.accounts FROM PUBLIC, anon, authenticated;
