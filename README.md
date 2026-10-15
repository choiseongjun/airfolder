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
- Supabase stores folder, membership, photo metadata and invitations. New selected photo and video files are preserved byte-for-byte (up to 50 MiB per file), with separate JPEG image previews up to 2560 pixels. Originals retain their embedded metadata. Older processed uploads cannot be reconstructed as originals. MP4, MOV and WebM videos use authenticated range streaming; playback depends on the device codec. Live Photo pairing is not supported.
- Photos default to photographer-only access, including from the folder owner. Batch sharing or optional immediate sharing exposes them to all folder members. Hiding them blocks subsequent access, but cannot revoke downloaded copies.
- Folder owners can create invitation links and QR codes valid for seven days. Anyone holding the link can choose to join. Member updates poll every 15 seconds.
- Downloads use the authorized image endpoint. English/Korean labels and date/number formats are supported. User-written names are preserved.

## Automatic language

The workspace and photo-sharing pages choose their initial language on the server: an explicit `?lang=en|ko` override, then the visitor's saved language cookie, then the connection country, then the browser's weighted `Accept-Language` preferences, and finally English. Korea (`KR`) uses Korean; other countries use English because these are the two supported translations. `/en` and `/ko` remain explicit public landing pages. Help/privacy pages retain their bilingual content.

Manual choices persist for one year in a `snaproom-language` cookie and in localStorage. Existing localStorage preferences migrate on the next workspace visit. Automatic country detection is not saved as a manual preference. New album/group invitations and photo-sharing links omit the sender's language so recipients get their own language.

Country detection reads Vercel's `x-vercel-ip-country` or Cloudflare's `cf-ipcountry` request header. The deployment's trusted proxy must supply/overwrite these headers (enable IP Geolocation on Cloudflare). Plain localhost and hosts without geolocation headers use browser language; no GPS permission or third-party IP lookup is requested. Headers are used only for UI language, never access control. See [Vercel request headers](https://vercel.com/docs/headers/request-headers) and [Cloudflare IP geolocation](https://developers.cloudflare.com/network/ip-geolocation/).

## Current limits

Guest access depends on this browser's cookie and expires after one year. Google/Apple login and guest-to-account migration are implemented. Both providers are enabled in the dedicated Firebase project; see AUTH_SETUP.md for deployment configuration and remaining real-login verification. Clearing cookies before connecting an account loses guest access. Invitations permit participation; they do not restore the original identity.

Private, whole-folder and selected-member sharing are implemented for media and dated records. The same permissions protect previews, original downloads, comments, moderation and face-search candidates. Payments, storage quotas and member removal are not implemented. Workspace loading returns up to 2,000 accessible photos; each guest may create up to 100 folders. Old local preview data is untouched and is not automatically uploaded.

Public hosting is not configured. Deploy the Next.js server with its private environment settings and a reachable HTTPS address for camera capture and invitations across devices. Localhost links only work on the originating machine.

## Public discovery and launch

The public introduction at `/ko` and `/en` includes a photo-led landing page, a shared-album illustration, an interactive three-frame memory-card preview, privacy information and FAQs. `/about` selects the introduction language using the same saved preference, country and browser-language rules as the workspace. Language-switch links remember the selection. All start buttons open the existing workspace. Original illustrative photos are served locally from `public/landing/`; their generation prompts are recorded in `docs/landing-assets.json`.

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


## Local face search

The optional “Find photos of me” screen asks for explicit consent and a single-face reference. It runs the pinned FaceAPI detector, landmarks and recognition model entirely on the device, scanning up to 50 authorized photos per batch. Reference photos and embeddings are not uploaded or persisted. Closing/resetting the search clears the reference; results are suggestions, never authorization or automatic publishing. Videos and images without a decodable preview are excluded. Device accuracy/performance still needs a representative real-user evaluation.

Models and browser bundle are self-hosted in `public/face-models`, copied from `@vladmandic/face-api@1.7.15` with its license. This upstream package is archived; review replacement/maintenance before broad rollout. No age, gender or emotion model is shipped. No external AI API key is required.

## Media deployment and verification

Run `node scripts/setup-server.mjs` to apply migration 008 and update only the private application storage bucket's media allowlist/50 MiB cap. Reverse proxies and hosting request limits must allow multipart requests up to 50 MiB plus headers; hosts with smaller request limits need a direct/resumable upload adapter before release. Native gallery/share permissions changed, so install a new native build.

`node scripts/test-media.mjs` verifies original byte hashes, preview sizes, video ranges and multi-user permission boundaries against synthetic fixtures and cleans them up. It expects a short MP4 at `artifacts/test-original.mp4`. `node scripts/test-face-engine.mjs` runs the bundled model on a public upstream test fixture at `artifacts/face-test-sample.jpg` (source URL in the script), including changed-brightness/size comparisons and a blank-image negative test. These are smoke tests, not a face-recognition accuracy benchmark. Do not claim every face is found or that iOS native behavior has been verified.
