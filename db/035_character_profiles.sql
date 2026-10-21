-- Experimental branch only. Originals are never stored; previews expire after 24 hours.
CREATE TABLE IF NOT EXISTS snaproom.character_profiles (
 viewer_id uuid PRIMARY KEY REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 active bytea,
 draft bytea,
 draft_at timestamptz,
 request_id uuid,
 busy_until timestamptz,
 usage_day date NOT NULL DEFAULT CURRENT_DATE,
 attempts integer NOT NULL DEFAULT 0
);
ALTER TABLE snaproom.character_profiles ENABLE ROW LEVEL SECURITY;
