ALTER TABLE snaproom.viewers ADD COLUMN IF NOT EXISTS display_name text CHECK(length(display_name) BETWEEN 1 AND 80);
