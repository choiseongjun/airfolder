ALTER TABLE snaproom.records ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE snaproom.photos ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS records_active_folder_date ON snaproom.records(folder_id,recorded_on DESC,id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS photos_active_folder_date ON snaproom.photos(folder_id,captured_at DESC,id) WHERE deleted_at IS NULL;
