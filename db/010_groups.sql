CREATE TABLE IF NOT EXISTS snaproom.groups (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES snaproom.viewers(id),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=500), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS snaproom.group_members (
 group_id uuid NOT NULL REFERENCES snaproom.groups(id) ON DELETE CASCADE,
 viewer_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 muted boolean NOT NULL DEFAULT false, joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(group_id,viewer_id)
);
ALTER TABLE snaproom.folders ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES snaproom.groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS folders_group ON snaproom.folders(group_id);
CREATE TABLE IF NOT EXISTS snaproom.group_invites (
 token_hash text PRIMARY KEY, group_id uuid NOT NULL REFERENCES snaproom.groups(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days'
);
CREATE OR REPLACE FUNCTION snaproom.sync_group_members() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   INSERT INTO snaproom.members(folder_id,viewer_id) SELECT id,NEW.viewer_id FROM snaproom.folders WHERE group_id=NEW.group_id ON CONFLICT DO NOTHING;
 ELSE
   DELETE FROM snaproom.members WHERE viewer_id=OLD.viewer_id AND folder_id IN(SELECT id FROM snaproom.folders WHERE group_id=OLD.group_id);
 END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS sync_group_members ON snaproom.group_members;
CREATE TRIGGER sync_group_members AFTER INSERT OR DELETE ON snaproom.group_members FOR EACH ROW EXECUTE FUNCTION snaproom.sync_group_members();
CREATE OR REPLACE FUNCTION snaproom.sync_group_album() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.group_id IS NOT NULL THEN
   INSERT INTO snaproom.members(folder_id,viewer_id) SELECT NEW.id,viewer_id FROM snaproom.group_members WHERE group_id=NEW.group_id ON CONFLICT DO NOTHING;
 END IF; RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS sync_group_album ON snaproom.folders;
CREATE TRIGGER sync_group_album AFTER INSERT OR UPDATE OF group_id ON snaproom.folders FOR EACH ROW EXECUTE FUNCTION snaproom.sync_group_album();

CREATE TABLE IF NOT EXISTS snaproom.notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), viewer_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 folder_id uuid NOT NULL REFERENCES snaproom.folders(id) ON DELETE CASCADE,
 photo_id uuid REFERENCES snaproom.photos(id) ON DELETE CASCADE,
 record_id uuid REFERENCES snaproom.records(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('photos','comment','like')), event_key text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz, pushed_at timestamptz,
 UNIQUE(viewer_id,event_key)
);
CREATE INDEX IF NOT EXISTS notifications_viewer_date ON snaproom.notifications(viewer_id,created_at DESC);
CREATE OR REPLACE FUNCTION snaproom.notify_photo_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT NEW.shared THEN RETURN NULL; END IF;
 INSERT INTO snaproom.notifications(viewer_id,folder_id,photo_id,actor_id,kind,event_key)
 SELECT m.viewer_id,NEW.folder_id,NEW.id,NEW.owner_id,'photos','photo:'||NEW.id FROM snaproom.members m
 WHERE m.folder_id=NEW.folder_id AND m.viewer_id<>NEW.owner_id
   AND snaproom.can_view(NEW.owner_id,NEW.shared,NEW.recipients,m.viewer_id)
   AND (TG_OP='INSERT' OR NOT snaproom.can_view(OLD.owner_id,OLD.shared,OLD.recipients,m.viewer_id))
 ON CONFLICT(viewer_id,event_key) DO NOTHING;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS notify_photo_publication ON snaproom.photos;
CREATE TRIGGER notify_photo_publication AFTER INSERT OR UPDATE OF shared,recipients ON snaproom.photos FOR EACH ROW EXECUTE FUNCTION snaproom.notify_photo_publication();
CREATE OR REPLACE FUNCTION snaproom.notify_interaction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_owner uuid; target_folder uuid; event_kind text;
BEGIN
 IF NEW.photo_id IS NOT NULL THEN SELECT owner_id,folder_id INTO target_owner,target_folder FROM snaproom.photos WHERE id=NEW.photo_id;
 ELSE SELECT owner_id,folder_id INTO target_owner,target_folder FROM snaproom.records WHERE id=NEW.record_id; END IF;
 IF target_owner=NEW.owner_id OR NOT EXISTS(SELECT 1 FROM snaproom.members WHERE folder_id=target_folder AND viewer_id=target_owner) THEN RETURN NULL; END IF;
 event_kind=CASE WHEN TG_TABLE_NAME='comments' THEN 'comment' ELSE 'like' END;
 INSERT INTO snaproom.notifications(viewer_id,folder_id,photo_id,record_id,actor_id,kind,event_key)
 VALUES(target_owner,target_folder,NEW.photo_id,NEW.record_id,NEW.owner_id,event_kind,
 CASE WHEN event_kind='comment' THEN 'comment:'||NEW.id ELSE 'like:'||COALESCE(NEW.photo_id,NEW.record_id)||':'||NEW.owner_id END)
 ON CONFLICT DO NOTHING; RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS notify_interaction ON snaproom.comments;
CREATE TRIGGER notify_interaction AFTER INSERT ON snaproom.comments FOR EACH ROW EXECUTE FUNCTION snaproom.notify_interaction();
DROP TRIGGER IF EXISTS notify_interaction ON snaproom.reactions;
CREATE TRIGGER notify_interaction AFTER INSERT ON snaproom.reactions FOR EACH ROW EXECUTE FUNCTION snaproom.notify_interaction();
ALTER TABLE snaproom.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA snaproom FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION snaproom.sync_group_members(),snaproom.sync_group_album(),snaproom.notify_photo_publication(),snaproom.notify_interaction() FROM PUBLIC,anon,authenticated;
