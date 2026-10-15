ALTER TABLE snaproom.viewers ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE snaproom.viewers ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE snaproom.viewers ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
CREATE TABLE IF NOT EXISTS snaproom.user_blocks (
 owner_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 blocked_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_id,blocked_id), CHECK(owner_id<>blocked_id)
);
CREATE INDEX IF NOT EXISTS user_blocks_reverse ON snaproom.user_blocks(blocked_id,owner_id);
CREATE TABLE IF NOT EXISTS snaproom.safety_reports (
 id uuid PRIMARY KEY, reporter_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 photo_id uuid REFERENCES snaproom.photos(id) ON DELETE CASCADE,
 record_id uuid REFERENCES snaproom.records(id) ON DELETE CASCADE,
 comment_id uuid REFERENCES snaproom.comments(id) ON DELETE CASCADE,
 target_user_id uuid REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 1000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','hidden','dismissed')),
 created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
 CONSTRAINT safety_report_one_target CHECK(num_nonnulls(photo_id,record_id,comment_id,target_user_id)=1),
 UNIQUE(reporter_id,photo_id), UNIQUE(reporter_id,record_id), UNIQUE(reporter_id,comment_id)
);
ALTER TABLE snaproom.safety_reports ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES snaproom.viewers(id) ON DELETE CASCADE;
ALTER TABLE snaproom.safety_reports DROP CONSTRAINT IF EXISTS safety_reports_check;
ALTER TABLE snaproom.safety_reports DROP CONSTRAINT IF EXISTS safety_report_one_target;
ALTER TABLE snaproom.safety_reports ADD CONSTRAINT safety_report_one_target CHECK(num_nonnulls(photo_id,record_id,comment_id,target_user_id)=1);
CREATE UNIQUE INDEX IF NOT EXISTS safety_report_user ON snaproom.safety_reports(reporter_id,target_user_id);
CREATE INDEX IF NOT EXISTS safety_reports_queue ON snaproom.safety_reports(created_at) WHERE status='open';
CREATE OR REPLACE FUNCTION snaproom.interaction_allowed(author uuid, who uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM snaproom.viewers v WHERE v.id=author AND v.deletion_requested_at IS NULL AND v.suspended_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM snaproom.user_blocks b WHERE (b.owner_id=who AND b.blocked_id=author) OR (b.owner_id=author AND b.blocked_id=who))
$$;
CREATE OR REPLACE FUNCTION snaproom.can_view(author uuid, published boolean, recipients uuid[], who uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT author=who OR (published AND (cardinality(recipients)=0 OR who=ANY(recipients)) AND snaproom.interaction_allowed(author,who))
$$;
ALTER TABLE snaproom.photos ADD COLUMN IF NOT EXISTS safety_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE snaproom.records ADD COLUMN IF NOT EXISTS safety_hidden boolean NOT NULL DEFAULT false;
-- Moderated media cannot be republished through an old client or a new share link.
CREATE OR REPLACE FUNCTION snaproom.prevent_unsafe_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.safety_hidden THEN NEW.shared=false; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS prevent_unsafe_publication ON snaproom.photos;
CREATE TRIGGER prevent_unsafe_publication BEFORE INSERT OR UPDATE ON snaproom.photos FOR EACH ROW EXECUTE FUNCTION snaproom.prevent_unsafe_publication();
DROP TRIGGER IF EXISTS prevent_unsafe_publication ON snaproom.records;
CREATE TRIGGER prevent_unsafe_publication BEFORE INSERT OR UPDATE ON snaproom.records FOR EACH ROW EXECUTE FUNCTION snaproom.prevent_unsafe_publication();
ALTER TABLE snaproom.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.safety_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.user_blocks,snaproom.safety_reports FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION snaproom.interaction_allowed(uuid,uuid),snaproom.can_view(uuid,boolean,uuid[],uuid),snaproom.prevent_unsafe_publication() FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS snaproom.deletion_receipts (
 token_hash text PRIMARY KEY,
 viewer_id uuid REFERENCES snaproom.viewers(id) ON DELETE SET NULL,
 requested_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
ALTER TABLE snaproom.deletion_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.deletion_receipts FROM PUBLIC,anon,authenticated;
