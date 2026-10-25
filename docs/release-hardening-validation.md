# Web release hardening — 2026-10-25

## Changes

- Character photos are resized to at most 1,024 pixels and re-encoded without source metadata before sending. The UI accepts JPEG/PNG/WebP up to 20 MiB; the API caps its body at 3 MiB, below the hosting request limit. Non-JSON error responses no longer break error handling.
- AI consent and the privacy page explain the provider, input handling, retention and deletion. Unapplied drafts expire after 24 hours; profile reads and the existing daily maintenance job remove expired drafts without deleting active profiles or interrupting active generation.
- Workspace photo responses use 200-item keyset pages with microsecond precision. Existing web consumers collect every page instead of silently stopping at 2,000 photos. Counts and covers retain visibility checks.
- Chunked uploads preserve selected recipients. Invalid recipients are rejected before staging. Member contribution counts use viewer IDs and visible shared photos; guest settings no longer claim an account is connected.
- The new feed/drawer album view waits for saved album settings before rendering, preserving the owner's theme, description, song, birthday and time-capsule settings. Loading failures offer a retry instead of silently opening a default theme.
- Upload start, success and failure events carry one attempt ID and media type. Image upload metrics use the same media scope. Historical start/failure events without a media type are excluded from these image-specific totals.
- Admin storage health and daily maintenance expose warnings at 70% and 85% of the existing charged storage budget. The 5 GiB hard cap remains; this change does not purchase or increase storage.
- Updated Next.js and Firebase Admin dependencies and the vulnerable transitive gRPC dependency. Request-specific maker metadata now has an explicit request boundary under Suspense. Loopback QA origins are accepted only in development; production origin checks remain strict.

## Completed validation

- 136 automated tests passed; TypeScript, ESLint and the production build passed.
- Dependency audit reported zero vulnerabilities, including production dependencies.
- Ego browser, two isolated guest sessions: invitation opening/joining, JPEG and 6.94 MB PNG uploads, visibility in the host album, invalid-file error feedback, maker preview/save, and the mobile layout at 390 × 844.
- A real AI generation accepted the large synthetic image after reducing the request to approximately 230 KB; applying it produced a 48 × 48 profile avatar. No personal face was needed for this check.
- A browser chunked upload with selected recipients completed successfully. Database checks confirmed the chosen member could see it and a different member could not.
- Real database transaction, rolled back: 2,307 photos across 12 pages, including microsecond ordering boundaries, no duplicates or private-photo leakage. Expired draft cleanup preserved applied images, fresh drafts and active generation leases.
- Stored development analytics showed one upload start and success per successful test photo, a failed-upload event for the invalid file, and maker save completion.

## Verification limits

- Mobile checks use Chromium emulation, not physical iOS Safari or Android devices.
- Storage warnings are in the admin screen and maintenance logs; external alert delivery is not configured by this change.
- These checks cover the changed web paths and existing automated regression suite, not every possible device, account or external-provider outage.
