-- Server-managed exceptions, tied to verified Firebase identity rather than email or browser state.
CREATE TABLE IF NOT EXISTS snaproom.storage_allowances (
 firebase_uid text PRIMARY KEY REFERENCES snaproom.accounts(firebase_uid) ON DELETE CASCADE,
 unlimited boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE snaproom.storage_allowances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.storage_allowances FROM PUBLIC,anon,authenticated;
