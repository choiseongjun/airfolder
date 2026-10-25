# Firebase Auth runtime compatibility

Production login failed before token verification: Firebase Admin imports jwks-rsa 4.1.0, whose CommonJS module requires ESM-only jose 6. The Vercel Node 24 runtime rejected that import with ERR_REQUIRE_ESM. Local Node 24 defaults masked the failure; disabling native require(ESM) reproduces it.

Scope the jose 5.10.0 CommonJS-compatible override to jwks-rsa only. Keep Firebase Admin and all existing token/issuer/audience/session checks unchanged. The regression test runs with require(ESM) disabled, loads Firebase Auth, resolves an RSA JWK and verifies a signature using the returned key. Revisit the override when upstream ships a loading mechanism compatible with the deployed runtime.
