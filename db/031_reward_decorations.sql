ALTER TABLE snaproom.folders ADD COLUMN IF NOT EXISTS reward_cover jsonb;
ALTER TABLE snaproom.rolling_paper_notes ADD COLUMN IF NOT EXISTS reward_sticker jsonb;
