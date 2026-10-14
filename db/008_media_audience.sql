ALTER TABLE snaproom.photos ADD COLUMN IF NOT EXISTS preview_path text;
ALTER TABLE snaproom.photos ADD COLUMN IF NOT EXISTS original_available boolean NOT NULL DEFAULT false;
ALTER TABLE snaproom.photos ADD COLUMN IF NOT EXISTS recipients uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE snaproom.records ADD COLUMN IF NOT EXISTS recipients uuid[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION snaproom.can_view(author uuid, published boolean, recipients uuid[], who uuid)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT author=who OR (published AND (cardinality(recipients)=0 OR who=ANY(recipients)))
$$;
REVOKE ALL ON FUNCTION snaproom.can_view(uuid,boolean,uuid[],uuid) FROM PUBLIC,anon,authenticated;
