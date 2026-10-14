# Groups and recurring memories

The product hierarchy is **My space / Group → Albums → Photos, videos, dated records and conversations**. The existing `folders` API/table remains the album implementation. `folders.group_id IS NULL` preserves every existing personal or separately shared album without widening access.

Solo albums can be moved into a group after an explicit sharing-change acknowledgement. Already-public items become visible to group members; private items stay private. Albums with other members or contributions cannot be moved, and old album invites are revoked.

## Membership and permissions

- A group has an owner and up to 200 members. Members can create albums; one membership applies to every existing and future album in that group.
- Group membership insertion/deletion synchronizes `snaproom.members` transactionally via database triggers. Existing media, downloads, discussions, face-search candidates and timeline routes continue to require album membership and the original private/selected/all audience checks.
- Group owners create 7-day invitation links and QR codes, rename groups, transfer ownership, remove members and revoke links. New links replace old ones. Member removal/leave revokes outstanding links. Legacy album invitation endpoints cannot grant access to a group album.
- Leaving a group revokes all album access, including the departing member's private media. Uploads remain. The UI explicitly asks for confirmation and advises downloading needed originals before leaving. Album administration transfers to the group owner. The group owner must transfer ownership before leaving.
- Guest-to-account merging preserves group ownership and deduplicates memberships and notifications. The account deletion worker transfers group ownership and group album administration to another active member where possible before deleting the user's contributions. With no successor, normal account deletion applies.
- New schema tables have RLS enabled and no public Data API grants. All operations pass through authenticated server routes. Membership mutations and new album creation lock the group row to serialize invitations, removals and inheritance.

## Notifications and return visits

- Only newly visible published media produces a photo notification. Private uploads never generate shared-photo notices. A unique recipient/event key makes retries and repeat publication requests idempotent.
- Comments and reactions notify the target author. Notification reads recheck album membership and current media visibility; withdrawn access cannot leak old notification contents.
- The notification screen groups events by album, kind and day. Read state is saved per recipient.
- Push delivery uses the existing Expo/FCM/APNs configuration, respects group mute, and suppresses repeated sends for the same member/album within five minutes. In-app events remain visible. Lock-screen text omits album names and content. Delivery remains gated by `PUSH_ENABLED` and configured device credentials; this change does not assert physical-device delivery is operational.
- Recap cards query authorized content in the viewer's time zone: this day in earlier years, and the previous calendar month. They show real counts and up to six media items per section. Empty states never fabricate memories.
- Date ranges can be set when creating albums and feed the existing native gallery date recommendation flow. No automatic gallery scanning, weekly nudges, scheduled anniversary pushes or reminder scheduling is enabled by this change. Those require explicit product preferences and physical-device validation.

## Validation and rollout

Run `node scripts/setup-server.mjs` (migration 010), `node scripts/test-groups.mjs`, `node scripts/test-accounts.mjs`, `npm test`, `npm run lint`, and `npm run build`. Group integration fixtures are isolated and removed afterward. They cover new-member inheritance, future albums, outsider denial, selected/private visibility, notification deduplication, muted push selection with a mocked provider, read state, recap authorization, group ownership transfer, removal and invite revocation.

The web and WebView share these screens and APIs. Production hosting, push credentials, delivery monitoring and scheduled retention features remain deployment work. The sample group created during UI validation is explicitly marked `[샘플]`; its album counts are actual database records, not invented activity.
