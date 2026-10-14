CREATE TABLE IF NOT EXISTS snaproom.records (
 id uuid PRIMARY KEY, folder_id uuid NOT NULL REFERENCES snaproom.folders(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000), recorded_on date NOT NULL,
 shared boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS snaproom.comments (
 id uuid PRIMARY KEY, photo_id uuid REFERENCES snaproom.photos(id) ON DELETE CASCADE,
 record_id uuid REFERENCES snaproom.records(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 1000), hidden boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(photo_id,record_id)=1)
);
CREATE TABLE IF NOT EXISTS snaproom.reactions (
 id uuid PRIMARY KEY, photo_id uuid REFERENCES snaproom.photos(id) ON DELETE CASCADE,
 record_id uuid REFERENCES snaproom.records(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(num_nonnulls(photo_id,record_id)=1),
 UNIQUE(photo_id,owner_id), UNIQUE(record_id,owner_id)
);
CREATE TABLE IF NOT EXISTS snaproom.comment_reports (
 id uuid PRIMARY KEY, comment_id uuid NOT NULL REFERENCES snaproom.comments(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 500), status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','dismissed','hidden')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(comment_id,owner_id)
);
CREATE INDEX IF NOT EXISTS records_folder_date ON snaproom.records(folder_id,recorded_on DESC,id);
CREATE INDEX IF NOT EXISTS comments_photo ON snaproom.comments(photo_id,created_at,id);
CREATE INDEX IF NOT EXISTS comments_record ON snaproom.comments(record_id,created_at,id);
CREATE INDEX IF NOT EXISTS comments_owner_date ON snaproom.comments(owner_id,created_at);
ALTER TABLE snaproom.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.comment_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.records,snaproom.comments,snaproom.reactions,snaproom.comment_reports FROM PUBLIC,anon,authenticated;

ALTER TABLE snaproom.records ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE snaproom.comments ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
