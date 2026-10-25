export const memoryLoopReportSql=`WITH events AS (
 SELECT * FROM snaproom.growth_events WHERE environment=$1 AND created_at>=now()-($2::int*interval '1 day')
), note_cohort AS (
 SELECT viewer_id,min(created_at) first_note FROM events WHERE event='note_created' GROUP BY viewer_id
), mature AS (SELECT * FROM note_cohort WHERE first_note<=now()-interval '7 days')
SELECT json_build_object(
 'notes',(SELECT count(*) FROM events WHERE event='note_created'),
 'noteWriters',(SELECT count(DISTINCT viewer_id) FROM events WHERE event='note_created'),
 'exports',(SELECT count(DISTINCT viewer_id) FROM events WHERE event='album_exported'),
 'notificationVisitors',(SELECT count(DISTINCT viewer_id) FROM events WHERE event='notification_opened'),
 'pushEnabled',(SELECT count(DISTINCT viewer_id) FROM events WHERE event='web_push_enabled'),
 'printInterest',(SELECT count(DISTINCT viewer_id) FROM events WHERE event='premium_interest' AND properties->>'feature'='prints'),
 'eligibleWriters',(SELECT count(*) FROM mature),
 'returningWriters',(SELECT count(*) FROM mature m WHERE EXISTS(SELECT 1 FROM snaproom.growth_events e WHERE e.environment=$1 AND e.viewer_id=m.viewer_id AND e.event='session_started' AND e.created_at>=m.first_note+interval '1 day' AND e.created_at<=m.first_note+interval '7 days'))
) AS report`;
export type MemoryLoopReport={notes:number;noteWriters:number;exports:number;notificationVisitors:number;pushEnabled:number;printInterest:number;eligibleWriters:number;returningWriters:number};
