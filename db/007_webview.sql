-- A WebView cookie is a child of its native session. Revoking the native session revokes its cookies too.
ALTER TABLE snaproom.sessions ADD COLUMN IF NOT EXISTS parent_hash text REFERENCES snaproom.sessions(token_hash) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS sessions_parent ON snaproom.sessions(parent_hash);
