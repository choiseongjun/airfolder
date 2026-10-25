-- Add preview-first entry measurements without removing existing event types.
DO $$ DECLARE expression text; BEGIN
 SELECT pg_get_expr(conbin,conrelid) INTO expression FROM pg_constraint WHERE conrelid='snaproom.growth_events'::regclass AND conname='growth_events_event_check';
 IF expression IS NOT NULL AND position('memory_intro_viewed' in expression)=0 THEN
  ALTER TABLE snaproom.growth_events DROP CONSTRAINT growth_events_event_check;
  EXECUTE 'ALTER TABLE snaproom.growth_events ADD CONSTRAINT growth_events_event_check CHECK (('||expression||') OR event IN (''memory_intro_viewed'',''memory_intro_flipped'',''memory_intro_started'',''memory_intro_engaged''))';
 END IF;
END $$;
