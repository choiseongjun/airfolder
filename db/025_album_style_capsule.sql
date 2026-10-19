-- Album look shared by every member (not just one browser), the album's song, and time capsules.
ALTER TABLE snaproom.folders ADD COLUMN IF NOT EXISTS theme text CHECK(theme ~ '^[a-z]{2,16}$');
ALTER TABLE snaproom.folders ADD COLUMN IF NOT EXISTS song text NOT NULL DEFAULT '' CHECK(length(song)<=80);
ALTER TABLE snaproom.folders ADD COLUMN IF NOT EXISTS reveal_at timestamptz;

-- While a capsule is locked, new photos and notes stay visible only to whoever added them.
ALTER TABLE snaproom.photos ADD COLUMN IF NOT EXISTS capsule_hold boolean NOT NULL DEFAULT false;
ALTER TABLE snaproom.records ADD COLUMN IF NOT EXISTS capsule_hold boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS photos_capsule_hold ON snaproom.photos(folder_id) WHERE capsule_hold;
CREATE INDEX IF NOT EXISTS records_capsule_hold ON snaproom.records(folder_id) WHERE capsule_hold;

CREATE OR REPLACE FUNCTION snaproom.hold_for_capsule() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 -- Someone who makes a held item private before the reveal keeps it private.
 IF TG_OP='UPDATE' AND NOT NEW.shared AND OLD.capsule_hold AND NEW.capsule_hold THEN NEW.capsule_hold=false; END IF;
 IF NEW.shared AND EXISTS(SELECT 1 FROM snaproom.folders WHERE id=NEW.folder_id AND reveal_at>now()) THEN
  NEW.shared=false; NEW.capsule_hold=true;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS hold_for_capsule ON snaproom.photos;
CREATE TRIGGER hold_for_capsule BEFORE INSERT OR UPDATE OF shared ON snaproom.photos FOR EACH ROW EXECUTE FUNCTION snaproom.hold_for_capsule();
DROP TRIGGER IF EXISTS hold_for_capsule ON snaproom.records;
CREATE TRIGGER hold_for_capsule BEFORE INSERT OR UPDATE OF shared ON snaproom.records FOR EACH ROW EXECUTE FUNCTION snaproom.hold_for_capsule();

-- Opens every due capsule the viewer belongs to. Called on read, so no scheduler is needed.
CREATE OR REPLACE FUNCTION snaproom.reveal_due_capsules(who uuid) RETURNS void LANGUAGE sql AS $$
 UPDATE snaproom.photos p SET shared=true, capsule_hold=false FROM snaproom.folders f, snaproom.members m
  WHERE p.capsule_hold AND f.id=p.folder_id AND f.reveal_at<=now() AND m.folder_id=f.id AND m.viewer_id=who;
 UPDATE snaproom.records r SET shared=true, capsule_hold=false, updated_at=now() FROM snaproom.folders f, snaproom.members m
  WHERE r.capsule_hold AND f.id=r.folder_id AND f.reveal_at<=now() AND m.folder_id=f.id AND m.viewer_id=who;
$$;
REVOKE ALL ON FUNCTION snaproom.hold_for_capsule(),snaproom.reveal_due_capsules(uuid) FROM PUBLIC,anon,authenticated;
