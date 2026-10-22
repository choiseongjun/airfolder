// A seven-day ordered funnel. A guest must join and share in the same album/group they opened.
export const growthReportSql = `
WITH events AS (
 SELECT * FROM snaproom.growth_events WHERE environment=$1 AND created_at>=now()-($2::int * interval '1 day')
), albums AS (
 SELECT f.id,f.owner_id,e.created_at FROM snaproom.folders f
 JOIN events e ON e.event='album_created' AND e.context_id=f.id
), album_activity AS (
 SELECT a.id,a.owner_id,a.created_at,count(p.id)::int photos,count(DISTINCT p.owner_id)::int contributors
 FROM albums a LEFT JOIN snaproom.photos p ON p.folder_id=a.id AND p.shared AND NOT p.safety_hidden
 AND cardinality(p.recipients)=0 AND p.mime LIKE 'image/%'
 GROUP BY a.id,a.owner_id,a.created_at
), opens AS (
 SELECT viewer_id,context_id,min(created_at) opened FROM events WHERE event='invite_opened' GROUP BY viewer_id,context_id
), joins AS (
 SELECT o.*,j.joined FROM opens o LEFT JOIN LATERAL (
  SELECT min(e.created_at) joined FROM snaproom.growth_events e
  WHERE e.environment=$1 AND e.event='invite_joined' AND e.viewer_id=o.viewer_id AND e.context_id=o.context_id
  AND e.created_at>=o.opened AND e.created_at<=o.opened+interval '7 days'
 ) j ON true
), funnel AS (
 SELECT j.*,u.uploaded FROM joins j LEFT JOIN LATERAL (
  SELECT min(e.created_at) uploaded FROM snaproom.growth_events e JOIN snaproom.folders f ON f.id=e.context_id
  WHERE e.environment=$1 AND e.event='upload_succeeded' AND e.viewer_id=j.viewer_id
  AND e.properties->>'shared'='true' AND e.properties->>'media_type'='image'
  AND (e.context_id=j.context_id OR f.group_id=j.context_id)
  AND e.created_at>=j.joined AND e.created_at<=j.opened+interval '7 days'
 ) u ON true
), host_views AS (
 SELECT viewer_id,min(created_at) viewed FROM events WHERE event='organizer_landing_view' GROUP BY viewer_id
), host_funnel AS (
 SELECT v.*,c.clicked,a.created FROM host_views v LEFT JOIN LATERAL (
  SELECT min(created_at) clicked FROM snaproom.growth_events WHERE viewer_id=v.viewer_id AND environment=$1
  AND event='organizer_cta_clicked' AND created_at>=v.viewed AND created_at<=v.viewed+interval '7 days'
 ) c ON true LEFT JOIN LATERAL (
  SELECT min(created_at) created FROM snaproom.growth_events WHERE viewer_id=v.viewer_id AND environment=$1
  AND event='album_created' AND properties->>'source'='organizer'
  AND created_at>=c.clicked AND created_at<=v.viewed+interval '7 days'
 ) a ON true
), acquisition_views AS (
 SELECT DISTINCT ON (properties->>'journey_id') properties->>'journey_id' journey,
 properties->>'campaign_source' source, properties->>'campaign_medium' medium,
 properties->>'campaign_name' campaign, created_at viewed
 FROM events WHERE event='site_visit' AND properties->>'journey_id' IS NOT NULL
 ORDER BY properties->>'journey_id',created_at
), acquisition_funnel AS (
 SELECT v.*,l.logged_in,s.signed_up,a.created,i.invited,k.guest,k.member,k.unknown FROM acquisition_views v
 LEFT JOIN LATERAL (SELECT min(created_at) logged_in FROM snaproom.growth_events
   WHERE environment=$1 AND properties->>'journey_id'=v.journey AND event='login'
   AND created_at>=v.viewed AND created_at<=v.viewed+interval '7 days') l ON true
 LEFT JOIN LATERAL (SELECT min(created_at) signed_up FROM snaproom.growth_events
   WHERE environment=$1 AND properties->>'journey_id'=v.journey AND event='sign_up'
   AND created_at>=v.viewed AND created_at<=v.viewed+interval '7 days') s ON true
 LEFT JOIN LATERAL (SELECT created_at created,context_id FROM snaproom.growth_events
   WHERE environment=$1 AND properties->>'journey_id'=v.journey AND event='album_created'
   AND created_at>=v.viewed AND created_at<=v.viewed+interval '7 days' ORDER BY created_at LIMIT 1) a ON true
 LEFT JOIN LATERAL (SELECT bool_or(properties->>'creator_type'='guest') guest,
   bool_or(properties->>'creator_type'='member') member,
   bool_or(COALESCE(properties->>'creator_type','unknown') NOT IN ('guest','member')) unknown
   FROM snaproom.growth_events WHERE environment=$1 AND properties->>'journey_id'=v.journey
   AND event='album_created' AND created_at>=v.viewed AND created_at<=v.viewed+interval '7 days') k ON true
 LEFT JOIN LATERAL (SELECT min(e.created_at) invited FROM snaproom.growth_events e
   WHERE e.environment=$1 AND e.properties->>'journey_id'=v.journey AND e.event='invite_created'
   AND (e.context_id=a.context_id OR e.context_id=(SELECT group_id FROM snaproom.folders WHERE id=a.context_id))
   AND e.created_at>=a.created AND e.created_at<=v.viewed+interval '7 days') i ON true
), days AS (
 SELECT generate_series((now() AT TIME ZONE 'UTC')::date-$2::int,(now() AT TIME ZONE 'UTC')::date,interval '1 day') AS bucket
)
SELECT json_build_object(
 'acquisition',(SELECT COALESCE(json_agg(x),'[]'::json) FROM (
   SELECT source,medium,campaign,count(*) visits,count(logged_in) logins,count(signed_up) signups,count(created) albums,count(invited) invites,
   count(*) FILTER(WHERE guest) "guestAlbums",count(*) FILTER(WHERE member) "memberAlbums",count(*) FILTER(WHERE unknown) "unknownAlbums"
   FROM acquisition_funnel GROUP BY source,medium,campaign ORDER BY count(*) DESC) x),
 'albums',(SELECT count(*) FROM albums),
 'albumCreators',(SELECT json_build_object(
   'guest',count(*) FILTER(WHERE properties->>'creator_type'='guest'),
   'member',count(*) FILTER(WHERE properties->>'creator_type'='member'),
   'unknown',count(*) FILTER(WHERE COALESCE(properties->>'creator_type','unknown') NOT IN ('guest','member'))
 ) FROM events WHERE event='album_created'),
 'activatedAlbums',(SELECT count(*) FROM album_activity WHERE contributors>=3 AND photos>=20),
 'sharedPhotos',(SELECT COALESCE(sum(photos),0) FROM album_activity),
 'contributors',(SELECT count(DISTINCT viewer_id) FROM events WHERE event='upload_succeeded' AND properties->>'media_type'='image'),
 'repeatHosts',(SELECT count(*) FROM (SELECT owner_id FROM albums GROUP BY owner_id HAVING count(DISTINCT (created_at AT TIME ZONE 'UTC')::date)>=2) repeated),
 'guestFunnel',(SELECT json_build_object('opened',count(*),'joined',count(joined),'uploaded',count(uploaded),
   'medianMinutes',percentile_cont(0.5) WITHIN GROUP(ORDER BY extract(epoch FROM uploaded-opened)/60) FILTER(WHERE uploaded IS NOT NULL),
   'stillMaturing',count(*) FILTER(WHERE opened>now()-interval '7 days')) FROM funnel),
 'hostFunnel',(SELECT json_build_object('viewed',count(*),'clicked',count(clicked),'created',count(created)) FROM host_funnel),
 'uploadAttempts',(SELECT count(*) FROM events WHERE event='upload_started'),
 'uploadFailures',(SELECT count(*) FROM events WHERE event='upload_failed'),
 'uploadSuccesses',(SELECT count(*) FROM events WHERE event='upload_succeeded' AND properties->>'media_type'='image'),
 'daily',(SELECT json_agg(json_build_object('date',to_char(d.bucket,'YYYY-MM-DD'),
   'albums',(SELECT count(*) FROM events WHERE event='album_created' AND (created_at AT TIME ZONE 'UTC')::date=d.bucket::date),
   'uploads',(SELECT count(*) FROM events WHERE event='upload_succeeded' AND properties->>'media_type'='image' AND (created_at AT TIME ZONE 'UTC')::date=d.bucket::date)) ORDER BY d.bucket) FROM days d),
 'failures',(SELECT COALESCE(json_agg(x),'[]'::json) FROM (SELECT COALESCE(properties->>'reason','other') reason,count(*)::int count FROM events WHERE event='upload_failed' GROUP BY properties->>'reason' ORDER BY count(*) DESC) x),
 'firstEvent',(SELECT min(created_at) FROM snaproom.growth_events WHERE environment=$1),
 'lastEvent',(SELECT max(created_at) FROM snaproom.growth_events WHERE environment=$1),
 'pendingDelivery',(SELECT count(*) FROM snaproom.growth_events WHERE environment='production' AND posthog_sent_at IS NULL),
 'lastDelivery',(SELECT max(posthog_sent_at) FROM snaproom.growth_events WHERE environment='production'),
 'exhaustedDelivery',(SELECT count(*) FROM snaproom.growth_events WHERE environment='production' AND posthog_sent_at IS NULL AND delivery_attempts>=20)
) report`;

export type GrowthReport = {
 acquisition: { source: string; medium: string; campaign: string; visits: number; logins: number; signups: number; albums: number; invites: number; guestAlbums: number; memberAlbums: number; unknownAlbums: number }[];
 albumCreators: { guest: number; member: number; unknown: number };
 albums: number; activatedAlbums: number; sharedPhotos: number; contributors: number; repeatHosts: number;
 guestFunnel: { opened: number; joined: number; uploaded: number; medianMinutes: number | null; stillMaturing: number };
 hostFunnel: { viewed: number; clicked: number; created: number };
 uploadAttempts: number; uploadFailures: number; uploadSuccesses: number;
 daily: { date: string; albums: number; uploads: number }[]; failures: { reason: string; count: number }[];
 firstEvent: string | null; lastEvent: string | null; pendingDelivery: number; lastDelivery: string | null; exhaustedDelivery: number;
 posthogConfigured: boolean; environment: string; days: number;
};
