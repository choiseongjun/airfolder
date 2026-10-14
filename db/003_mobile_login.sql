CREATE TABLE IF NOT EXISTS snaproom.mobile_login_codes (
  code_hash text PRIMARY KEY,
  viewer_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
  challenge text NOT NULL CHECK (challenge ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL
);
ALTER TABLE snaproom.mobile_login_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.mobile_login_codes FROM PUBLIC, anon, authenticated;
ALTER TABLE snaproom.folders ADD COLUMN IF NOT EXISTS starts_on date;
ALTER TABLE snaproom.folders ADD COLUMN IF NOT EXISTS ends_on date;
