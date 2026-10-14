ALTER TABLE snaproom.records ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '' CHECK(length(title)<=120);
CREATE TABLE IF NOT EXISTS snaproom.record_photos (
 record_id uuid NOT NULL REFERENCES snaproom.records(id) ON DELETE CASCADE,
 photo_id uuid NOT NULL UNIQUE REFERENCES snaproom.photos(id) ON DELETE CASCADE,
 position integer NOT NULL CHECK(position>=0), PRIMARY KEY(record_id,photo_id)
);
ALTER TABLE snaproom.record_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.record_photos FROM PUBLIC,anon,authenticated;
ALTER TABLE snaproom.share_links ADD COLUMN IF NOT EXISTS record_id uuid REFERENCES snaproom.records(id) ON DELETE CASCADE;
