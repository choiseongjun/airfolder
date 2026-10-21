# Character profile experiment

Branch: codex/character-profile. Entry: /crew/settings, tap the profile circle.

Requires migration db/035_character_profiles.sql, CHARACTER_PROFILE_ENABLED=1 and
server-only OPENAI_API_KEY. Uses OpenAI images/edits, gpt-image-1.5, medium quality,
one 1024px image per request; stores a normalized 512px WebP.

Only this branch's settings profile circle displays the character. Crew members'
avatars and production remain unchanged until that integration is explicitly shipped.
The feature is disabled by default; no API key is committed.

Input: JPG/PNG/WebP, 6 MiB, 24 megapixels maximum. Original bytes are processed
in memory and sent to OpenAI after explicit consent, not persisted by this app.
The provider has its own data retention policy.
Active and pending images are private and viewer-scoped. A preview is usable for
24 hours; applying it replaces the active image. Delete clears both images without
resetting usage. Account deletion cascades to this table.

Budget: 3 attempts per viewer per database calendar day, 30 total. Failed provider
requests count toward the cap because upstream billing may already have occurred.
Database locking reserves budget before network requests. The 3-minute lease is
longer than the 150-second provider timeout. Original profile stays unchanged on failure.

Verification: npm test; npm run build; targeted ESLint. Test API key model access
separately; a model lookup does not guarantee image-generation billing eligibility.
