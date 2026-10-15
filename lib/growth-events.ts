// Only coarse, explicitly allowed properties may leave the app. Never add free text here.
export const clientEvents = ['organizer_landing_view', 'organizer_cta_clicked', 'upload_started', 'upload_failed'] as const;
export type ClientGrowthEvent = typeof clientEvents[number];
export type GrowthEvent = ClientGrowthEvent | 'album_created' | 'invite_created' | 'invite_opened' | 'invite_joined' | 'upload_succeeded';
export function growthProperties(input: Record<string, unknown> = {}) {
  const result: Record<string, string | boolean> = {};
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
