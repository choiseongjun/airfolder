# Dedicated Firebase login setup

The Google/Apple login UI, verified-token endpoint, account table, guest migration and logout are implemented. A dedicated Firebase project is required; the recommand-menu Firebase project has NOT been reused.

## Provisioning state

Dedicated Firebase project **Snaproom** (`snaproom-ad17b`, project number `863331811763`) and web app **Snaproom Web** (`1:863331811763:web:7f04cd4184efbf1b654bc6`) were created. Its public web configuration is saved in `.env.local`. Analytics, Gemini and paid billing were not enabled.

Apple registrations are complete: Team `2RURMCLKF2`, primary App ID `com.choisj2702.snaproom`, Services ID `com.choisj2702.snaproom.web`, domain `snaproom-ad17b.firebaseapp.com`, return URL `https://snaproom-ad17b.firebaseapp.com/__/auth/handler`. Dedicated Sign in with Apple key `5JDP6NDUC9` (Snaproom Apple Login) was issued with the user's approval and downloaded. Its private file is stored outside this workspace at `C:\Users\csj27\.snaproom-secrets\AuthKey_5JDP6NDUC9.p8`; never commit, print, or copy it to public environment variables. The existing apps and keys were not modified.

**Provider setup completed:** Google and Apple both show enabled in Firebase Authentication. Google public app name is Snaproom. The dedicated Apple key has been registered in Firebase. Authorized domains include localhost, snaproom-ad17b.firebaseapp.com and snaproom-ad17b.web.app. NEXT_PUBLIC_FIREBASE_AUTH_ENABLED=true is saved locally. Google sign-in was completed by the user and verified in the app; reloading restored the signed-in Google account from the server session. Apple end-to-end sign-in remains unverified.

The earlier console loading errors cleared after the user reopened the project; no IAM permission changes or duplicate resources were needed. Separately, the localhost browser tab was stuck on a data: connection-error page even though the server returned HTTP 200.

## Deployment and verification checklist

1. Open the existing project at https://console.firebase.google.com/project/snaproom-ad17b/authentication/ . Do not create a duplicate.
2. The Web app is already registered. No Hosting, Analytics, Firestore or Firebase Storage is required; the existing Supabase backend stores app data.
3. The SDK values in `.env.local` are already populated. Keep FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_PROJECT_ID identical. These web SDK values are public configuration; do not place Apple private keys in NEXT_PUBLIC variables.
4. Google and Apple are enabled and localhost is authorized. Add the eventual production hostname to authorized domains before release.
5. Apple credentials listed above are already saved in Firebase. Do not issue another key or overwrite another app's settings.
6. NEXT_PUBLIC_FIREBASE_AUTH_ENABLED is true locally. Build with the same public configuration when deploying. Google sign-in and session persistence after reload have been verified on localhost. Test Apple sign-in and both providers on the production domain and intended mobile browsers before release.

New Apple credentials or agreements require the account owner's action/approval in the developer console. Never paste private keys into chat. Apple configuration depends on the final dedicated Firebase auth domain.

## Implemented security and behavior

- Firebase Admin verifies signature, issuer and project audience. Only fresh Google/Apple sign-ins are accepted; emulator verification is disallowed.
- Accounts are identified by Firebase UID. Matching email addresses never merge separate identities.
- A first login upgrades the guest workspace; later login from another guest workspace moves its folders, photos and memberships into the existing account in one transaction, preserving private/shared status.
- Old guest sessions are revoked. Login rotates the application's HttpOnly, SameSite cookie (30 days). Logout revokes the current session. Firebase client state is in-memory and cleared after token exchange.
- Account changes are blocked while uploads are pending or failed, to keep the upload queue associated with the correct viewer.
- Failed/unconfigured sign-in is visible; the app does not simulate a successful login.

## Verification

`npm test` validates identity claims and translations. `node scripts/test-accounts.mjs` tests real database migration using synthetic verified identities inside a transaction that is always rolled back. It does not provide any production authentication bypass. `node scripts/test-server.mjs` checks the existing photo API with temporary fixtures.

Official configuration references:
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/auth/web/apple
- https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web
