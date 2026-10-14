# Snaproom

Use your favourite camera, collect photos into purpose-based folders, and share selected photos with invited members. The Expo app in `mobile/` serves hosts and repeat users; the web remains the invitation entrance and desktop workspace. English and Korean are supported.

See [mobile/README.md](mobile/README.md) for native setup, account handoff, date recommendations, share receiving, upload recovery and the remaining real-device checks.

## Server setup

The app uses the existing Supabase project configured for recommand-menu, with an isolated `snaproom` Postgres schema and private `snaproom-photos` Storage bucket. It does not modify that app's tables or authentication settings. No separate Supabase project was created.

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and supply server-only credentials. Never prefix secrets with NEXT_PUBLIC_. If DATABASE_URL references a CA certificate, include it at the configured path; do not disable TLS verification.
3. Run `node scripts/setup-server.mjs` for the idempotent schema and private bucket setup.
4. Run `npm run dev` and open http://localhost:3000.

All browser requests use the Next.js API. Database and Supabase secrets remain on the server. The API uses hashed HttpOnly guest sessions, checks folder membership and photo ownership, and authorizes every photo download. Direct anonymous/authenticated schema access is revoked; RLS is enabled.

## Behavior

- Creating a web folder opens a photo-collection dialog. Choose existing photos first, or optionally open the camera. Consecutive shots remain supported.
- An IndexedDB queue retains photos before upload. Failed uploads support manual retry and recover after reload within the same guest session.
- Supabase stores folder, membership, photo metadata and invitations. Images are converted to JPEG, resized to at most 2560 pixels per dimension and stripped of metadata. Original files are not archived.
- Photos default to photographer-only access, including from the folder owner. Batch sharing or optional immediate sharing exposes them to all folder members. Hiding them blocks subsequent access, but cannot revoke downloaded copies.
- Folder owners can create invitation links and QR codes valid for seven days. Anyone holding the link can choose to join. Member updates poll every 15 seconds.
- Downloads use the authorized image endpoint. English/Korean labels and date/number formats are supported. User-written names are preserved.

## Current limits

Guest access depends on this browser's cookie and expires after one year. Google/Apple login and guest-to-account migration are implemented. Both providers are enabled in the dedicated Firebase project; see AUTH_SETUP.md for deployment configuration and remaining real-login verification. Clearing cookies before connecting an account loses guest access. Invitations permit participation; they do not restore the original identity.

Specific-member sharing, payments, storage quotas, member removal and original-resolution archival are not implemented. Workspace loading returns up to 2,000 accessible photos; each guest may create up to 100 folders. Old local preview data is untouched and is not automatically uploaded.

Public hosting is not configured. Deploy the Next.js server with its private environment settings and a reachable HTTPS address for camera capture and invitations across devices. Localhost links only work on the originating machine.

## Public discovery and launch

Public, server-rendered product pages are available at `/en` and `/ko`, with localized HTML language, headings, descriptions, canonical/hreflang links, Open Graph/Twitter metadata, a share image and WebApplication structured data. `/` remains the private workspace and is marked noindex; API responses also carry X-Robots-Tag. Robots directives are crawl guidance, not access control; existing session authorization still protects photos.

The production domain is not chosen. Leave `SITE_URL` unset locally and on previews: public pages remain noindex and sitemap.xml is empty. Before the production build, set `SITE_URL=https://your-verified-domain` (origin only) to enable public-page indexing and absolute metadata/sitemap URLs. Rebuild after changing it. Only English and Korean are currently localized.

After deployment, add the production domain to Firebase Authentication, verify the domain in Google Search Console/Bing Webmaster Tools and submit `/sitemap.xml`. Neither search-console verification nor sitemap submission has been performed; these require the real domain. Check real mobile camera/login performance, privacy/terms disclosures and consent requirements before a global launch. This SEO implementation does not complete those release tasks.

## Verification commands

```sh
npm test
npm run lint
npm run build
node scripts/test-server.mjs
node scripts/test-accounts.mjs
node scripts/test-mobile.mjs
```

The integration script needs a running server and .env.local. It creates three temporary guests, a folder and generated images in the configured project. It tests privacy, outsider denial, owner-only changes, invitation joining, idempotent upload and atomic batch authorization, then removes only its fixtures. Set TEST_BASE_URL to test another running instance.
