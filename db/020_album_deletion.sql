-- Persist storage cleanup independently of the deleted album.
CREATE TABLE IF NOT EXISTS snaproom.storage_deletions (
 object_path text PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE snaproom.storage_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.storage_deletions FROM PUBLIC,anon,authenticated;
