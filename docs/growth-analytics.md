# Organizer onboarding and growth analytics

Current rollout decision: use the built-in analytics first and defer the external PostHog connection. The current PostHog organization requires card registration for another project; no new project or billing change was made. Leave `POSTHOG_PROJECT_API_KEY` empty. Internal event collection and `/admin/analytics` work independently. The adapter remains available for a later connection.

## Entry points

- `/ko/hosts`, `/en/hosts`: organizer introduction and example-space link.
- `/start?lang=ko`: create one album, then copy its seven-day invite / QR. A failed invite request reuses the created album.
- `/join/:token?lang=ko`: preview, policy acceptance, join, album selection for groups, selected-photo upload, retry and completion. Existing `/?invite=:token` links redirect here.
- `/admin/analytics`: existing administrator authentication, including mandatory initial password change. No business metrics are exposed without authentication. The admin footer links here.

The guest flow uploads up to 50 selected images, 20 MiB each. The sharing choice and final button explicitly identify the audience. It uses the existing staged chunk upload protocol and retries with the same photo UUID, album and audience. Successful files are not resent. Keep the page open: this focused guest flow retains selected files in memory, and warns before leaving with unfinished files; it does not promise offline recovery after closing the tab. Use the full workspace for videos and the existing persistent queue.

## Installation / deployment

1. Apply `db/019_growth_analytics.sql` with the server database role. It is additive and idempotent; `scripts/setup-server.mjs` includes it. The administrator features also require `018_admin.sql`.
2. Create a separate PostHog project, **메모네스티아**, in the intended organization. Copy its project token (write-only project key, not a personal secret API key).
3. Configure server-only `POSTHOG_PROJECT_API_KEY` and `POSTHOG_HOST=https://us.i.posthog.com` (or the EU ingestion host for an EU project). No browser SDK or public environment key is needed: the server sends only explicitly allowed events using PostHog's batch API.
4. Set `ANALYTICS_ENVIRONMENT=production` **only on the production deployment**. It defaults to `development` even in a local production build. Preview/development events remain in the local analytics table and are never sent to PostHog.
5. Configure `CRON_SECRET` (at least 32 random characters). The daily `/api/maintenance/analytics` job in `vercel.json` removes events older than 90 days and retries up to 250 pending deliveries. Other hosts must invoke this authenticated endpoint daily. New events also retry a small pending batch. Twenty failed delivery attempts require operator investigation.
6. Deploy, visit the introduction, create a real pilot album and invite someone. Check `/admin/analytics` and PostHog Activity for the new events. An HTTP 200 from PostHog means request acceptance, not confirmed processing. The dashboard reports the last successful HTTP response and pending deliveries honestly.

No unrelated deployment or production environment configuration is changed by these source files. Keep tokens out of Git. Review the updated privacy notice alongside actual provider region and retention settings. Server-held events cascade away on account deletion. For a PostHog erasure request, the external ID is SHA-256 of `memolumi-growth:` plus the internal viewer UUID; use PostHog's deletion process and the project retention policy. Do not send the raw viewer UUID or other account information to PostHog.

## Measurement definitions

| Event | Trusted point | Deduplication / meaning |
| --- | --- | --- |
| `organizer_landing_view` | Browser, same-origin endpoint | Unique viewers in the host funnel; raw visits can repeat |
| `organizer_cta_clicked` | Browser, same-origin endpoint | Explicit start CTA |
| `album_created` | Server after successful creation | One per album; source `organizer` / `workspace` |
| `invite_created` | Server after invite persistence | One per invite; creation is not a delivered invitation |
| `invite_opened` | Server after valid preview | Non-owner, once per viewer + target + UTC day |
| `invite_joined` | Server after membership confirmation | Non-owner, once per viewer + target + UTC day; includes returning members |
| `upload_started`, `upload_failed` | Guest upload UI | Per attempt; retry included; failures contain only coarse reasons |
| `upload_succeeded` | Server after successful image/video persistence | One per photo UUID across retries; image/video and shared flag only |

- **Active album:** an instrumented album created in the selected window, still present, with at least three distinct photo contributors and twenty current images shared with all album members. Excludes private/selected-recipient/hidden photos. This is an initial activation hypothesis, not a validated revenue predictor.
- **Repeat host:** an album owner creating observed albums on at least two distinct UTC days in the selected window. This is a repeat-creation proxy, not cohort retention.
- **Guest funnel:** first valid invite open in the selected window, then membership confirmation, then successful *shared image* upload to that same album/group, within seven days of opening. Identity + target pairs are counted, not raw visits. Later group moves are interpreted with the current album/group relationship. Recently opened cohorts can still convert.
- **Host funnel:** introduction view → CTA → album created from the dedicated organizer flow, in order, within seven days, by the same viewer.
- **Daily chart:** UTC calendar days intersecting the rolling selected period. Date boundaries are not Korea-local midnight.
- Counts start when instrumentation is installed. No historical backfill, fake sample metrics or payment/revenue estimates are displayed. Browser/session IDs can split when cookies are cleared or an account is connected; metrics are not guaranteed cross-device person counts.
- `upload_succeeded` covers the whole app, while attempts/failures cover only the guest UI. Do not divide these to invent an app-wide success rate.

The server is the source of completed joins/uploads. Client requests cannot submit those events. The event endpoint requires a service session, same-origin check, allowlisted event/properties, and membership for upload events; it also limits recent event volume. Product actions continue if analytics fails. Events and delivery attempts persist locally; PostHog uses a stable `$insert_id` for delivery deduplication.

No automatic click capture, page URL/referrer capture, recordings, photo content, filenames, album names, email addresses or user IPs are sent. External identifiers are pseudonymous hashes. DNT/GPC disables event persistence/delivery for that request. Diagnostic metrics therefore omit opted-out visits.

## Checks

- `npm test`: privacy allowlist, failure isolation, DNT/GPC and existing suite.
- `node scripts/test-growth.mjs`: real PostgreSQL aggregation checks using an isolated temporary events table and fixture transaction; always rolled back.
- `node scripts/test-growth-http.mjs`: localhost API flow with disposable viewers, an image upload, retries and expired/revoked invitations. Cleans its database and storage fixtures. Run only against the intended local development server on port 3000.
- `npx tsc --noEmit`, `npm run lint -- --quiet`, `npm run build`.
- Check desktop/mobile introduction, start CTA, expired invitation, legal-consent gate, group with no albums, sharing choice, partial failure/retry, and unauthenticated analytics rejection.

PostHog API reference: https://posthog.com/docs/api/capture
