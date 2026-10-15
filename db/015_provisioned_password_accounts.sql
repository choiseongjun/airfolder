BEGIN;
ALTER TABLE snaproom.accounts DROP CONSTRAINT accounts_provider_check;
ALTER TABLE snaproom.accounts ADD CONSTRAINT accounts_provider_check
  CHECK (provider IN ('google.com', 'apple.com', 'password'));
COMMIT;
