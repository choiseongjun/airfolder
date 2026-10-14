ALTER TABLE snaproom.share_links ADD COLUMN IF NOT EXISTS access text NOT NULL DEFAULT 'public' CHECK(access IN ('public','members'));
ALTER TABLE snaproom.share_links ALTER COLUMN access SET DEFAULT 'members';
