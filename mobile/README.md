# Snaproom mobile

Public brand: **Memolumi**. Existing bundle IDs, storage keys and EAS project identity remain stable.

## Release preparation (2026-10-14)

- Android back closes previews/dialogs, clears photo selection, returns to folders, then exits at the root. Camera and photo picker additions accumulate without discarding previously selected images; cancelling preserves the current selection.
- Device notifications use Expo Push Service (FCM on Android, APNs on iOS). Users opt in from Account. `/api/push` binds registration to the authenticated session, and logout/account-deletion revocation cascades to device registrations. Shared-photo notifications contain no photos or folder names. Sending is opt-in on the server with `PUSH_ENABLED=true`, after delivery verification; failures do not roll back publication. This is best-effort delivery, not a durable notification queue.
- Configure the project's Android Firebase app and `google-services.json`, upload FCM v1 credentials to EAS, and configure an APNs push key for the Apple team. Those account-side steps and real-device receipt tests are still outstanding. Never commit service-account JSON or APNs private keys. Adding the notification native module requires rebuilding the development client.
- `/privacy` and `/support` are initial bilingual pages. `SUPPORT_EMAIL` and a deployed HTTPS origin must be set before submitting their URLs. The policy still needs operator/contact/retention review before publication.
- Account deletion can be initiated in Account. The API revokes sessions and records a request. Operators run `node scripts/process-account-deletions.mjs` to inspect pending counts, and `--execute` to process requests older than five minutes using server-only `FIREBASE_SERVICE_ACCOUNT_JSON`. It deletes the Firebase identity, uploaded photos, owned folders (including member photos), and associated application records. The worker must be scheduled/operated before launch; requesting deletion does not currently execute this worker automatically.
- App Store Connect app ID: `6822636339`. English/Korean descriptions, promotional copy and keywords are saved as a draft. Real iOS screenshots, production build, privacy declarations, review access/contact, public URLs and account agreement remain outstanding. Never substitute web-preview or Android screenshots for verified iOS captures.

Validation: `node scripts/test-device-settings.mjs` covers invalid tokens, session-bound unregistration, origin protection, deletion confirmation, session revocation and rejection of stale sessions for deleting accounts.

Expo SDK 57 / React Native application for collecting photos. The existing Next.js web application is still the invitation entrance and desktop workspace. There is no second database: this app calls the same `/api` routes and uses the same Firebase-backed account, Postgres folders and private Supabase bucket.

## Implemented

- English/Korean interface, device language detection and saved language preference.
- Google/Apple account connection through the existing web sign-in and a one-time, verifier-bound exchange. Device tokens live in SecureStore, expire after 30 days and are separately revocable. No database credentials or Supabase service keys belong in the native application.
- Folder creation with a date range; local calendar-day photo recommendations, paged by 60. Photos are not uploaded automatically. Limited gallery permission is respected.
- Manual system photo selection, optional camera and incoming image shares. Choose a destination folder and up to 100 photos per batch, then explicitly add them privately.
- Files copied to application storage before uploading, persisted queue, bounded retries, account/server isolation, idempotent server IDs and OS-scheduled background retry. Photos are processed to JPEG up to 2560px; originals are not archived or deleted.
- Same-account app/web folders, permission-checked photo viewing/export, member-wide batch publication and hiding, web invitation links and joining by pasted invitation.

## Development

### Browser preview

With the root Next.js server running, run `npm run preview:web` from `mobile/`, then open `http://localhost:3000/mobile-preview/index.html`. This renders the actual React Native screen tree through React Native Web, with a phone-width layout. Re-run the command after code changes; this is a static preview, not a hot-reloading Metro session.

Platform-specific `.web.ts` adapters use the same-origin HttpOnly browser session (including existing Google/Apple account login), a real IndexedDB foreground upload queue and the real server. No CORS exception, fake account or native token in localStorage is added. The preview may also use the web's guest session. Use the main web workspace to sign in, then return to the preview.

Browser verification (2026-10-14): created `Expo 웹 검증용 폴더`, selected a generated JPEG, uploaded it privately, confirmed it appears in the existing Next.js workspace, published and hid it again, downloaded and checked the resulting 1200×800 JPEG, generated/copied an invitation, reselected the same file and confirmed duplicate exclusion, reloaded to check persistence, switched languages and rejected an inverted date range. The demonstration folder/photo remain private for inspection. Browser console inspection reported no warnings/errors. This verifies the web adapters and shared screen logic; it does not validate native Google/Apple callback or OS integrations.

Gallery date queries, incoming OS shares and native background scheduling deliberately remain unavailable on web. Manual photo picking, folders, actual uploads, privacy changes, invitations and downloads can be exercised. The generated files in `public/mobile-preview/` are ignored and marked noindex. The `dist-web` build and generated preview should not be treated as a substitute for device testing.

### Native development

```sh
# Repository root: apply the additive migration and run the web/API server
node scripts/setup-server.mjs
npm run dev

# In mobile/
npm install
npx expo start --dev-client
```

Set `EXPO_PUBLIC_API_URL` to the reachable API origin. A gitignored `.env.development.local` is configured for this machine's current Wi-Fi address, `http://172.30.1.72:3000`. The address can change; the phone and PC need to be on the same network. The phone's localhost is not this PC. `.env.example` shows the format. Do not change firewall rules without checking the intended network scope.

The browser sign-in bridge also needs that hostname in Firebase Authentication → Settings → Authorized domains. The dedicated project is `snaproom-ad17b`. Existing localhost sign-in does not establish that a LAN hostname is authorized. This LAN host has **not** been registered or tested on a phone. For external testing, use the deployed HTTPS server and register its verified hostname. There is no production domain yet.

This app requires a **development build**, not just Expo Go: incoming sharing and background tasks depend on native configuration. Android local build requires Android SDK/JDK (`npm run android`); iOS local build requires macOS/Xcode (`npm run ios`). Alternatively, with your Expo account and project configured:

```sh
npx eas-cli build --profile development --platform android
npx eas-cli build --profile development --platform ios
```

EAS is linked to `@seongjunchoi/snaproom`, project ID `656c1ca2-14c7-46b5-b528-089bcf4a5592`. The existing primary App ID is `com.choisj2702.snaproom`; the share extension has a separate provisioning target. iOS internal-distribution credentials are not yet configured: the cached Apple session expired and the account owner must finish Apple login and device/signing setup. `scripts/build-ios.ps1` runs that interactive flow; never enter a password at a plain PowerShell prompt or in chat. Store distribution is not configured.

The `development` EAS profile supplies the current LAN API address. Preview/production still require a reachable HTTPS origin. Do not use the development profile or LAN address for production.

For this Windows machine, Android SDK is under `%LOCALAPPDATA%/Android/Sdk`; the Android Studio bundled Java 25 caused a native CMake build failure. A checksum-verified Temurin JDK 17 is stored in the ignored root `.tools/jdk17` directory. Run `scripts/build-android.ps1` from PowerShell to build the debug APK for x86_64 and arm64-v8a. The dedicated emulator is `Snaproom_Pixel` (Android 36). The Expo development server runs on port 8081; it is distinct from the Next.js server on port 3000 and the exported web preview.

## Native capabilities and limits

- The sharing config adds Android SEND/SEND_MULTIPLE for images and an iOS share extension with image-only activation. The iOS app group defaults to `group.com.choisj2702.snaproom`; EAS can configure it during a signed build. A manual Xcode build needs the corresponding Apple app group and provisioning for both targets.
- **iOS incoming sharing is experimental in Expo 57.** Expo currently opens the main app from its extension using a mechanism not officially supported by Apple. This needs real-device and release review; it is not a guarantee of App Store acceptance or future iOS compatibility. See [Expo Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/).
- Native background upload sessions and a registered task improve recovery, but the OS chooses background execution. The nominal minimum retry interval is 15 minutes. Force-quitting, battery restrictions or expired authentication can stop progress. Reopening resumes retained jobs. See [Expo BackgroundTask](https://docs.expo.dev/versions/latest/sdk/background-task/).
- Suggestions match accessible photos by date, not AI scene recognition, album import or continuous camera-roll monitoring. Shared images without readable capture metadata use import time. iCloud-only photos can require downloading first.
- Refresh occurs on foreground entry and every 15 seconds while open. The current server returns up to 2,000 accessible photos. Folder/photo lists use the existing server limits. There is no original-resolution archive, video upload, selected-member ACL, universal/app links, push notification or subscription purchase implementation.
- Upload history remains on the device for duplicate detection. Failed queue copies can be removed explicitly; original gallery files are untouched. Switching accounts is blocked during active uploads; reconnection with remaining jobs must use the same account.

## Verification

```sh
npm run typecheck
npm test
npx expo-doctor
npx expo export --platform ios --platform android
npx expo prebuild --platform android --no-install

# Root, with API server running:
node scripts/test-mobile.mjs
```

Verified locally: TypeScript, date/DST and queue-isolation tests, Expo dependency checks, both JavaScript/Hermes platform bundles, Android native project generation and iOS config introspection. The API integration test uses temporary synthetic accounts, verifies native/web private-photo and invitation behavior, and removes only its fixtures. It does not bypass or validate a real Google/Apple login.

**Android native verification (2026-10-14):** `assembleDebug` succeeded with JDK 17 for x86_64 and arm64-v8a. Installed on the dedicated Android 36 emulator and launched the native React Native onboarding screen through the Expo development client on port 8081. No ReactNativeJS/AndroidRuntime errors were reported in the inspected startup log. The APK is also served from `http://172.30.1.72:3000/downloads/snaproom-development.apk` while the local API server is running; generated APKs are ignored by source control. This is a development client, so it needs the running Metro server. A generated test image was placed in the emulator's Pictures directory for later gallery testing.

**Not yet verified:** iOS native compilation/installation, physical-phone installation, native Google/Apple browser callback, real photo permissions, SNOW/system share-sheet delivery on iOS/Android, cloud-only assets, background transfer with the screen locked, and queue recovery after OS termination. iOS EAS build currently requires the account owner's expired Apple login to be renewed, followed by signing/device setup. Before release, run these scenarios on real devices with the deployed HTTPS host and a signed development build. The LAN Firebase auth hostname must also be authorized before physical-phone sign-in.
