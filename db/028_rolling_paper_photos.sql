CREATE TABLE IF NOT EXISTS snaproom.rolling_paper_note_photos (
 note_id uuid NOT NULL REFERENCES snaproom.rolling_paper_notes(id) ON DELETE CASCADE,
 photo_id uuid NOT NULL REFERENCES snaproom.photos(id) ON DELETE CASCADE,
 position integer NOT NULL CHECK(position BETWEEN 0 AND 3),
 PRIMARY KEY(note_id, photo_id),
 UNIQUE(note_id, position)
);

ALTER TABLE snaproom.rolling_paper_note_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON snaproom.rolling_paper_note_photos FROM PUBLIC, anon, authenticated;
