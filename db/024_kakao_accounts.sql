BEGIN;
-- Kakao accounts are verified server-side and stored with a 'kakao:' prefixed id in firebase_uid.
ALTER TABLE snaproom.accounts DROP CONSTRAINT accounts_provider_check;
ALTER TABLE snaproom.accounts ADD CONSTRAINT accounts_provider_check
  CHECK (provider IN ('google.com', 'apple.com', 'password', 'kakao'));
COMMIT;
