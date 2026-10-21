ALTER TABLE snaproom.accounts
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

COMMENT ON COLUMN snaproom.accounts.last_login_at IS
  'Last successful authenticated login; NULL until the first tracked login. Not a last-active timestamp.';
