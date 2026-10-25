# Memory participation release — 2026-10-25

## Delivered
- Shared Korean/English five-tab navigation and responsive shell; common album destinations retain language and group.
- Invitation note participation without account registration: nickname, consent, optional shared-photo selection and up to 1,000 characters.
- Localized invitation metadata and note-oriented preview copy.
- Permission-scoped album ZIP export: stored originals, full notes JSON, printable offline HTML and paginated photo/note PNG cards. Browser print supports PDF output.
- Optional Web Push with persistent server-only VAPID keys, subscription ownership, expired-session filtering, visibility/mute checks and notification deep links.
- Server-verified note creation, export, notification-return and premium-interest reporting; mature seven-day return cohort.
- Optional rewards remain collapsed in settings. Printing/photobook interest is explicitly marked unavailable; no payment is charged.

## Validation
- 144 unit tests passed.
- Disposable-account integration passed: invite joining, consent, 1,000-character notes, retry deduplication, private-photo isolation, export access control, hidden-note notification filtering, push endpoint validation, forged analytics rejection and expired invites.
- Ego browser: English invite submitted a long note, opened the new photo drawer and downloaded a ZIP.
- ZIP inspection confirmed originals, two paginated cards, exact note preservation and escaped HTML. The last rendered card preserved the end of the note without clipping.
- Production build and TypeScript checked before release.

## Operational limits
- Actual Web Push delivery requires browser opt-in; external delivery was not exercised with a real user's subscription. iOS requires a compatible installed Home Screen web app.
- Printing, paid themes, checkout and fulfillment are not implemented. Interest analytics measure demand only.
- Core navigation/settings/feed/invitation/export are bilingual; older optional character/reward/travel-editor copy still needs a separate comprehensive translation pass.
- Migration `039_memory_participation.sql` must be applied before deploying these endpoints. It was applied to the configured database during validation.

## Production follow-up
- Production smoke tests exposed PostgreSQL `XX000 CONNECTION_CAPACITY` errors. Warm Vercel functions were using the Supabase session pool.
- Vercel now uses the Supabase transaction endpoint with two connections per process, a five-second idle timeout and a sixty-second connection lifetime. Non-Supabase and local connection endpoints are unchanged. TLS query parameters are preserved.
- Member panels only poll while visible, pause in hidden tabs, and back off after errors. This avoids background queries from collapsed albums.
- The transaction endpoint, transaction-scoped advisory locks and session-table queries were verified directly. Connection-mode choice follows [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).
