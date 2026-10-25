// Only coarse, explicitly allowed properties may leave the app. Never add free text here.
export const clientEvents = ['album_exported','notification_opened','premium_interest','site_visit', 'session_started', 'photo_request_viewed', 'photo_request_started', 'photo_request_link_copied', 'photo_request_share_opened', 'photo_request_failed', 'trip_story_viewed','trip_story_previewed','trip_story_exported','trip_story_share_opened','trip_story_invite_copied', 'album_maker_viewed', 'album_picker_opened', 'album_photos_selected', 'album_preview_ready', 'album_save_started', 'album_save_failed', 'album_photo_failed', 'login_start', 'login_failed', 'organizer_landing_view', 'organizer_cta_clicked', 'upload_started', 'upload_failed'] as const;
export type ClientGrowthEvent = typeof clientEvents[number];
export type GrowthEvent = ClientGrowthEvent | 'note_created' | 'web_push_enabled' | 'trip_story_saved' | 'trip_story_contributed' | 'album_save_completed' | 'login' | 'sign_up' | 'album_created' | 'invite_created' | 'invite_opened' | 'invite_joined' | 'upload_succeeded';
export function growthProperties(input: Record<string, unknown> = {}) {
  const result: Record<string, string | boolean | number> = {};
  for (const key of ['campaign_source', 'campaign_medium', 'campaign_name', 'session_source', 'session_medium', 'session_campaign']) if (typeof input[key] === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(input[key] as string)) result[key] = input[key] as string;
  for (const key of ['session_id', 'attempt_id']) if (typeof input[key] === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(input[key] as string)) result[key] = input[key] as string;
  if (['prints','premium_themes','backup'].includes(String(input.feature))) result.feature=String(input.feature);
  if (typeof input.template_id === 'string' && /^album-[a-z]{3,20}$/.test(input.template_id)) result.template_id = input.template_id;
  if (Number.isInteger(input.photo_count) && Number(input.photo_count) >= 1 && Number(input.photo_count) <= 30) result.photo_count = Number(input.photo_count);
  if (typeof input.journey_id === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(input.journey_id)) result.journey_id = input.journey_id;
  if (['kakao','google','apple','password'].includes(String(input.method))) result.method = String(input.method);
  if (['organizer', 'guest', 'workspace'].includes(String(input.source))) result.source = String(input.source);
  if (input.flow === 'photo_request'||input.flow==='trip_story') result.flow = input.flow;
  if (['guest', 'member'].includes(String(input.creator_type))) result.creator_type = String(input.creator_type);
  if (['ko', 'en'].includes(String(input.locale))) result.locale = String(input.locale);
  if (['image', 'video'].includes(String(input.media_type))) result.media_type = String(input.media_type);
  if (['album', 'group'].includes(String(input.invite_type))) result.invite_type = String(input.invite_type);
  if (['network', 'size', 'storage', 'format', 'permission', 'other'].includes(String(input.reason))) result.reason = String(input.reason);
  if (typeof input.shared === 'boolean') result.shared = input.shared;
  return result;
}
export function uploadFailureReason(message: string) {
  if (/TOO_LARGE/.test(message)) return 'size';
  if (/STORAGE|QUOTA/.test(message)) return 'storage';
  if (/IMAGE|UNSUPPORTED|MEDIA_TYPE/.test(message)) return 'format';
  if (/MEMBER|SESSION|TERMS|SUSPENDED|NOT_FOUND/.test(message)) return 'permission';
  if (/fetch|network|Network/.test(message)) return 'network';
  return 'other';
}
