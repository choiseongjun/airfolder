# Shared trip story — 2026-10-25

## Emotional memory presentation update

The writing question is now “너는 그날을 어떻게 기억해?”. Three optional writing cues change only the placeholder, preserving the user's words. Character buttons open an individual contribution; the shared view previews the first three and keeps all remaining contributions accessible through those buttons. Photos stay adjacent to their own author's words on screen and in the PNG export. Invitation copy asks for the friend's memory in a letter-like panel.

Validated locally with Ego: cue changes preserve draft text; selecting a character shows only that contributor's photo and words; previous-card navigation works; shared PNG download was visually inspected; 390px layout has no horizontal overflow or nested buttons. Temporary two-person fixtures were page-local, not saved to the database, and the QA route was removed. Targeted ESLint, TypeScript, the three story tests and the production build passed. This update has not been deployed; native mobile sharing and a new end-to-end persisted invitation were not retested.

## Product experiment

The travel entry (`/make?occasion=travel`, including the existing default photo-request entry) now starts a shared trip story. The host adds 1–3 real photos, a name and an answer to “이번 여행에서 가장 웃겼던 순간은?”. The invitation asks a friend for one photo and their own answer. Invite holders can see the first result before joining; saving joins the existing album and adds a card. Existing themes and non-travel campaigns keep their current entry.

The first version exports 1080×1920 PNG cards. It uses selected animal emoji or an explicitly opted-in, already-applied profile character. It does not generate new portraits, rewrite people’s memories or create videos. The next-trip link provides a repeat-use entry. The new photo drawer exposes the story, normal photo album and rolling paper as separate tabs.

## Storage and access

Apply `db/037_trip_story.sql` before releasing the web changes. It adds `folders.story_mode`, a private metadata table linked to existing rolling-paper notes, and new event names. Original photos and notes continue using the existing storage and access system.

Only the contributor’s own, non-deleted, non-hidden, shared image photos in the target album can be attached. Selected-recipient and held capsule photos are excluded. Read access requires album membership or an unexpired matching invitation. Photo visibility is re-evaluated on reads. Profile character bytes are served through a permission-checked endpoint; deleting the applied profile removes the shared avatar and leaves the chosen animal fallback. Already-downloaded images cannot be recalled.

Deleting one’s story deletes its linked note and attachments, while preserving the original photos. Persisted IDs prevent duplicate albums, photos and notes on retries. Before a note submission, a failed image can be replaced; after an uncertain note submission, retries retain the same data and ID. Unsaved drafts are page-local and do not survive navigation/reload.

## Validation

- Automated suite: 139 tests pass, including staged retry/idempotency, guest creation scope and analytics property filtering.
- Real database transaction, rolled back: seven forbidden photo cases; duplicate note retry; payload conflict; nonmember and expired-invite denial; other-owner deletion denial; changed photo visibility; profile removal; own note deletion with original preservation.
- Ego browser, separate fresh guest identities: host saves three photos, copies invitation; invitee previews, joins and contributes one photo; the result contains two people and their actual words.
- New photo drawer reopens the same story; photo album and rolling-paper tabs work. No nested buttons or broken story images after load.
- Invalid JPEG upload fails, the input remains editable, replacing it with a valid photo succeeds. An opted-in test profile renders at 38×38 CSS pixels; deletion returns 404 from the previously accessible avatar URL and the UI falls back to an animal.
- Browser PNG download inspected. Mobile width 390 has no horizontal overflow. Scoped styles override legacy global button resets.
- Production build, ESLint and TypeScript validation pass. Final production smoke check and fixture cleanup are recorded separately in the local task artifacts.

## Measurement and limits

The admin report shows attempts entering/previewing, distinct albums first saved or receiving a friend’s contribution, copied invitations, export actions, native share-window opens and people saving at least two distinct stories. These are independent period counts, not an ordered conversion funnel. A share-window open is not a confirmed external post. Words, names, images and character data are excluded from analytics properties. QA sessions are recorded as development data and removed with their test identities.

Current story responses display up to the first 100 notes; each image card shows at most four photos and three quotes. Full on-screen text remains available; long text is truncated in exported images. Native share behavior depends on browser/platform and needs real iOS/Android validation; desktop download fallback is available. The feature’s customer demand and repeat use still require real groups to try it—engineering QA is not market validation.
