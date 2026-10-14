CREATE TABLE IF NOT EXISTS snaproom.share_links (
 id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL,
 owner_id uuid NOT NULL REFERENCES snaproom.viewers(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
 revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS snaproom.share_link_photos (
 link_id uuid NOT NULL REFERENCES snaproom.share_links(id) ON DELETE CASCADE,
 photo_id uuid NOT NULL REFERENCES snaproom.photos(id) ON DELETE CASCADE,
 PRIMARY KEY(link_id,photo_id)
);
ALTER TABLE snaproom.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE snaproom.share_link_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.share_links,snaproom.share_link_photos FROM PUBLIC,anon,authenticated;
