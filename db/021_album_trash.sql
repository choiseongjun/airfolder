ALTER TABLE snaproom.folders ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS folders_trash_expiry ON snaproom.folders(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE OR REPLACE FUNCTION snaproom.album_active(album uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM snaproom.folders WHERE id=album AND deleted_at IS NULL)
$$;
REVOKE ALL ON FUNCTION snaproom.album_active(uuid) FROM PUBLIC,anon,authenticated;
-- Serialize new content with trash/restore so uploads cannot race into a trashed album.
CREATE OR REPLACE FUNCTION snaproom.require_active_album() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM snaproom.folders WHERE id=NEW.folder_id AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ALBUM_UNAVAILABLE'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS active_album_content ON snaproom.photos;
CREATE TRIGGER active_album_content BEFORE INSERT OR UPDATE OF folder_id ON snaproom.photos FOR EACH ROW EXECUTE FUNCTION snaproom.require_active_album();
DROP TRIGGER IF EXISTS active_album_content ON snaproom.records;
CREATE TRIGGER active_album_content BEFORE INSERT OR UPDATE OF folder_id ON snaproom.records FOR EACH ROW EXECUTE FUNCTION snaproom.require_active_album();
DROP TRIGGER IF EXISTS active_album_content ON snaproom.upload_sessions;
CREATE TRIGGER active_album_content BEFORE INSERT ON snaproom.upload_sessions FOR EACH ROW EXECUTE FUNCTION snaproom.require_active_album();
REVOKE ALL ON FUNCTION snaproom.require_active_album() FROM PUBLIC,anon,authenticated;
