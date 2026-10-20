ALTER TABLE snaproom.comments
  ADD COLUMN IF NOT EXISTS note_color text NOT NULL DEFAULT 'cream'
    CHECK (note_color IN ('cream','peach','sage','lavender')),
  ADD COLUMN IF NOT EXISTS note_photo_id uuid REFERENCES snaproom.photos(id) ON DELETE SET NULL;
