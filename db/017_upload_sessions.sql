-- Small, bounded, resumable staging area. Originals move to object storage on completion.
CREATE TABLE IF NOT EXISTS snaproom.upload_sessions (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 folder_id uuid NOT NULL REFERENCES snaproom.folders(id) ON DELETE CASCADE,
 size_bytes bigint NOT NULL CHECK(size_bytes BETWEEN 1 AND 52428800),
 fields jsonb NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '1 hour'
);
CREATE TABLE IF NOT EXISTS snaproom.upload_chunks (
 upload_id uuid NOT NULL REFERENCES snaproom.upload_sessions(id) ON DELETE CASCADE,
 part integer NOT NULL CHECK(part BETWEEN 0 AND 16),
 body bytea NOT NULL CHECK(octet_length(body)<=3145728),
 PRIMARY KEY(upload_id,part)
);
ALTER TABLE snaproom.upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.upload_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.upload_sessions,snaproom.upload_chunks FROM PUBLIC,anon,authenticated;
