# Store policy audit — 2026-10-15

This is a source/configuration audit, not a store approval or a legal certification. Existing submission metadata was preserved. The uploaded build 2 does not contain these native changes. Concurrent workspace changes outside the files below were not treated as verified store submissions.

The safety schema (migration 016) was applied to the configured database. Web and native source changes have **not** been deployed or submitted. Verification passed: production Next build, root unit tests (35), rollback-only safety/deletion integration, memory API integration (63 checks), mobile unit tests/type checking, and iOS/Android Expo exports. Exports do not verify signed binaries or actual devices. Existing integration fixtures now explicitly accept the current policy as disposable test identities.

The subsequent admin-console implementation applied migration 018 and provisioned a separate administrator requiring a first-login password change. It adds scoped report previews, decisions and appeals, suspension controls, deletion retries, and a 30-day action audit. Updated verification passed 37 unit tests, rollback-only admin/safety SQL integration, TypeScript, scoped ESLint, and a production build. Temporary browser-test identities and reports were removed. Production Firebase deletion credentials, deployment, and live-provider deletion verification remain pending; see [admin operations](admin-operations.md).

## Implemented

| Area | Change | Verification |
| --- | --- | --- |
| Terms before UGC | Bilingual `/terms`, affirmative consent with a version/time record, server checks before uploads and content writes | Invalid/missing consent rejected in integration test |
| Reporting | Photos, videos, stories, comments and members can be reported to the operator, independently of album ownership | Unauthorized/private targets and cross-origin requests rejected |
| Blocking | Member and author blocking; symmetric content access, downloads, comments, reactions and notification filtering; unblock in Account | PostgreSQL permission and API checks |
| Moderation | `/admin` report queue, scoped private previews, hide/dismiss/suspend and appeal actions, separate password/session authentication, and action history; hidden photos/stories cannot be republished by changing visibility | Database trigger, authentication, rate limit, preview-scope and suspension integration checks |
| Deletion | `/delete-account`, guest deletion, Apple token revocation before accepting an Apple request, session revocation, private completion receipt | Wrong identity and failed revocation leave sessions/data intact |
| Data cleanup | Serialized, retryable worker removes originals/previews and account data, transfers surviving groups and older shared albums, preserves other members' data; admin page exposes failure/retry status | Rollback-only fixtures with fake storage/auth and storage failures; no real users deleted |
| Recipient privacy | Removing the last selected recipient makes the content private | Integration regression check |
| Scheduled cleanup | Protected daily Vercel job, same deletion core as CLI, failure/pending counts, expired receipt cleanup | Requires production secret/configuration and operational verification |
| Public disclosures | Privacy and support updated for public links, embedded metadata, consent records, reporting, blocking, receipts and optional permissions | Browser preview at desktop and 390px width |
| Native configuration | Memolumi display name, iOS incoming share extension disabled, unused Face ID and release local-network declarations removed, Android microphone/media-location/overlay/legacy write permissions blocked | Expo SDK 57 production introspection |

Blocking applies to authenticated identities. A public link still permits signed-out access; revoking the link stops that access. Downloaded copies cannot be recalled. Existing apps remain subject to server authorization, but the new native deletion flow and permission changes require a new binary.

## Release blockers and account-side checks

1. **Deploy the final reviewed web commit and submit new signed iOS/Android binaries.** Do not represent a web deployment as updating build 2. `mobile/eas.json` increments build numbers. `mobile/android` and `mobile/ios` are generated/ignored; use a fresh CNG build. Run the production profile so release permission cleanup is applied.
2. **Operate deletion.** Set server-only `FIREBASE_SERVICE_ACCOUNT_JSON` for the correct Firebase project and a random `CRON_SECRET` of at least 32 characters. Verify the Vercel daily job is registered after deployment, its execution succeeds, and no requests exceed 30 days. Monitor failed executions and pending counts. Do a real disposable-account test for both providers, storage cleanup and the completion receipt. This audit did not delete real accounts or activate a cloud schedule.
3. **Operate moderation and content filtering.** Assign an operator to review the queue promptly, handle appeals and child safety escalation. The report/hide system is implemented; automatic photo/video classification and a comprehensive pre-publication objectionable-content filter are **not** implemented. Resolve the filtering requirement before claiming full compliance with Apple 1.2. Do not describe a report button as an automated content filter.
4. **Test Apple revocation on an actual account/device.** The implementation uses Firebase's documented Apple revocation endpoint and checks a fresh matching Firebase identity. Real provider configuration, browser return, cancellation and re-registration need device verification. The automated test mocks provider responses.
5. **Update store declarations from the released binary.** Privacy URL `/privacy`, support `/support`, external deletion URL `/delete-account`, community/child-safety standards `/terms`. Include consent, block/report records, support correspondence, user IDs, media/stories/comments/reactions, notification/device data and hosting diagnostics as applicable. Inspect embedded location metadata and region/language processing when answering location questions. No advertising/tracking SDK was found; do not equate that with “no data collected.” Reconfirm data linked to users, purposes, optionality, encryption and deletion answers in both consoles.
6. **Android broad media permission review.** The app still requests READ_MEDIA_IMAGES/VIDEO for date-based gallery discovery. Explain the recurring core feature, provide the required review evidence and retain the system picker path when access is denied. A custom picker alone does not qualify. If permission review does not approve this use, remove broad access and the dependent gallery-query feature. Inspect the final release AAB, not an old debug manifest.
7. **Real screenshots and device QA.** Existing preparation files identify web captures, not verified native screenshots. Replace/validate them against the actual new iPhone/iPad and Android builds. Verify login, denial/limited gallery access, camera, original downloads, background queue, notifications, account deletion and return-to-app. iOS incoming share reception is intentionally disabled until a supported implementation is available; outgoing system sharing remains.
8. **Current platform/account requirements.** Verify Xcode 26/iOS 26 SDK or newer, Android target API 36 or newer, final SDK privacy manifests and required-reason APIs, signing, export compliance, developer verification, trader/contact details and regional declarations. The old generated Android debug manifest targets 36, but that does not verify the new AAB. Recheck age rating/UGC/messaging answers, target audience, children's privacy/guardian-consent rules and applicable child-safety declarations. An age rating does not verify user age or parental consent.
9. **Operating information.** Confirm actual Firebase/Supabase/Vercel processing regions, transfer basis, provider agreements, backup/log retention and local privacy disclosures for the countries selected in the stores. The public policy must reflect these operational facts; provider contracts and retention settings were not verified here.
10. **Google production access.** Existing release records identify a closed test submission, not a verified production release. Verify test participation and the applicable production-access requirements in Play Console. No new store submission or withdrawal was made by this audit.

## Operator commands

Run from the repository root using the server environment. Never place credentials in public variables or logs.

```sh
# Apply schema with normal server setup (includes migration 016).
node scripts/setup-server.mjs

# Read-only deletion backlog; actual execution only processes previously requested deletions.
node scripts/process-account-deletions.mjs
node scripts/process-account-deletions.mjs --execute

# Operator report queue; inspect privately, then choose a decision.
node scripts/review-safety-reports.mjs
node scripts/review-safety-reports.mjs --report REPORT_UUID
node scripts/review-safety-reports.mjs --report REPORT_UUID --action hide
node scripts/review-safety-reports.mjs --report REPORT_UUID --action dismiss
node scripts/review-safety-reports.mjs --report REPORT_UUID --action suspend

# Verification; database test rolls back all fixtures and never calls real storage/auth deletion.
node scripts/test-safety.mjs
npm test
npm run lint
npm run build
```

The Vercel job runs daily at 00:00 UTC (09:00 Korea), requires `Authorization: Bearer <CRON_SECRET>`, and fails closed if either secret or Firebase administration configuration is absent. It processes bounded batches and reports remaining work as a non-success response. Higher volume needs a durable queue/worker rather than relying on a single serverless invocation. Receipts expose only pending/completed state and dates, use a random bearer value in the URL fragment, and expire 30 days after completion.

## Primary sources checked

- [Apple App Review Guidelines — UGC, accurate metadata, permissions, privacy and account deletion](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Apple App Privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple SDK submission requirements](https://developer.apple.com/news/upcoming-requirements/?id=04282026a)
- [Google Play User Generated Content](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en)
- [Google Play User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en-gb)
- [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Google Play media permissions](https://support.google.com/googleplay/android-developer/answer/14115180?hl=en-CA)
- [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-EN)
- [Google Play developer requirements](https://support.google.com/googleplay/android-developer/answer/10788890?hl=en)
- [Firebase Apple authentication and revocation](https://firebase.google.com/docs/auth/web/apple)
- [Identity Platform token revocation API](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/accounts/revokeToken)
- [Expo 57 incoming sharing limitation](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/)
- [Expo permission configuration](https://docs.expo.dev/guides/permissions/)
- [Vercel cron deployment](https://vercel.com/docs/cron-jobs/quickstart)
