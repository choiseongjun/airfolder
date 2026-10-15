CREATE TABLE IF NOT EXISTS snaproom.admin_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 username text NOT NULL UNIQUE CHECK(username ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
 password_hash text NOT NULL,
 must_change_password boolean NOT NULL DEFAULT true,
 disabled boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), password_changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS snaproom.admin_sessions (
 token_hash text PRIMARY KEY,
 admin_id uuid NOT NULL REFERENCES snaproom.admin_users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_sessions_owner ON snaproom.admin_sessions(admin_id);
CREATE TABLE IF NOT EXISTS snaproom.admin_login_limits (
 key text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS snaproom.admin_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 admin_id uuid REFERENCES snaproom.admin_users(id) ON DELETE SET NULL,
 action text NOT NULL, subject_id uuid,
 note text NOT NULL DEFAULT '' CHECK(length(note)<=1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_date ON snaproom.admin_audit(created_at DESC);
ALTER TABLE snaproom.viewers ADD COLUMN IF NOT EXISTS deletion_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE snaproom.viewers ADD COLUMN IF NOT EXISTS deletion_last_attempt_at timestamptz;
ALTER TABLE snaproom.viewers ADD COLUMN IF NOT EXISTS deletion_last_error text;
ALTER TABLE snaproom.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.admin_login_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.admin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.admin_users,snaproom.admin_sessions,snaproom.admin_login_limits,snaproom.admin_audit FROM PUBLIC,anon,authenticated;
