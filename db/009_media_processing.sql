ALTER TABLE snaproom.photos ADD COLUMN IF NOT EXISTS preview_mime text;
ALTER TABLE snaproom.photos ADD COLUMN IF NOT EXISTS preview_status text NOT NULL DEFAULT 'pending';
ALTER TABLE snaproom.photos ADD COLUMN IF NOT EXISTS preview_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE snaproom.photos ADD COLUMN IF NOT EXISTS preview_retry_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE snaproom.photos ADD COLUMN IF NOT EXISTS preview_size_bytes bigint;
UPDATE snaproom.photos SET preview_mime='image/jpeg',preview_status='ready' WHERE preview_path IS NOT NULL AND preview_mime IS NULL;
CREATE INDEX IF NOT EXISTS photos_preview_pending ON snaproom.photos(preview_retry_at) WHERE preview_status IN ('pending','processing');
