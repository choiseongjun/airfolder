// Only coarse, explicitly allowed properties may leave the app. Never add free text here.
export const clientEvents = ['site_visit', 'login_start', 'login_failed', 'organizer_landing_view', 'organizer_cta_clicked', 'upload_started', 'upload_failed'] as const;
export type ClientGrowthEvent = typeof clientEvents[number];
export type GrowthEvent = ClientGrowthEvent | 'login' | 'sign_up' | 'album_created' | 'invite_created' | 'invite_opened' | 'invite_joined' | 'upload_succeeded';
export function growthProperties(input: Record<string, unknown> = {}) {
  const result: Record<string, string | boolean> = {};
  for (const key of ['campaign_source', 'campaign_medium', 'campaign_name']) if (typeof input[key] === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(input[key] as string)) result[key] = input[key] as string;
  if (typeof input.journey_id === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(input.journey_id)) result.journey_id = input.journey_id;
  if (['kakao','google','apple','password'].includes(String(input.method))) result.method = String(input.method);
  if (['organizer', 'guest', 'workspace'].includes(String(input.source))) result.source = String(input.source);
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
