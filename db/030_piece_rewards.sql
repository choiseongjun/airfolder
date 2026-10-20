-- Cosmetic collections are personal to each viewer and space. Never expose a
-- crew-wide count that could reveal uploads the viewer cannot access.
CREATE TABLE IF NOT EXISTS snaproom.piece_reward_months (
 viewer_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 space_key text NOT NULL,
 month date NOT NULL CHECK (extract(day FROM month) = 1),
 pieces integer NOT NULL CHECK (pieces >= 0),
 PRIMARY KEY (viewer_id, space_key, month)
);
CREATE TABLE IF NOT EXISTS snaproom.piece_reward_loadouts (
 viewer_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 space_key text NOT NULL,
 equipment jsonb NOT NULL DEFAULT '{}'::jsonb,
 PRIMARY KEY (viewer_id, space_key)
);
ALTER TABLE snaproom.piece_reward_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.piece_reward_loadouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.piece_reward_months, snaproom.piece_reward_loadouts FROM PUBLIC, anon, authenticated;
