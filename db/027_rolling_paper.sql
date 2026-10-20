CREATE TABLE IF NOT EXISTS snaproom.rolling_paper_notes (
 id uuid PRIMARY KEY,
 folder_id uuid NOT NULL REFERENCES snaproom.folders(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 500),
 hidden boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rolling_paper_folder_date
 ON snaproom.rolling_paper_notes(folder_id, created_at, id);

ALTER TABLE snaproom.rolling_paper_notes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.rolling_paper_notes FROM PUBLIC, anon, authenticated;
