CREATE TABLE IF NOT EXISTS snaproom.wall_pins (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 photo_id uuid NOT NULL UNIQUE REFERENCES snaproom.photos(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 x real NOT NULL, y real NOT NULL, rotation real NOT NULL,
 rare boolean NOT NULL DEFAULT false,
 pinned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wall_pins_pinned_at ON snaproom.wall_pins(pinned_at DESC);
ALTER TABLE snaproom.wall_pins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.wall_pins FROM PUBLIC,anon,authenticated;
