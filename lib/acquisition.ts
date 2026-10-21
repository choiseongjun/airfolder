export const attributionCookie = 'memonestia_attribution';
export type Attribution = { journey_id: string; acquired_at: number; campaign_source: string; campaign_medium: string; campaign_name: string };
const slug = (value: unknown) => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value) ? value.toLowerCase() : '';
export function parseAttribution(raw: string | undefined, now = Date.now()): Attribution | null {
  try {
    const a = JSON.parse(decodeURIComponent(raw || ''));
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(a.journey_id) || !Number.isFinite(a.acquired_at) || a.acquired_at > now || now - a.acquired_at > 30 * 86400000) return null;
    return { journey_id: a.journey_id, acquired_at: a.acquired_at, campaign_source: slug(a.campaign_source) || 'direct', campaign_medium: slug(a.campaign_medium) || 'none', campaign_name: slug(a.campaign_name) || 'none' };
  } catch { return null; }
}
export function attributionFromCookie(cookie: string) {
  return parseAttribution(cookie.split(';').map(s => s.trim()).find(s => s.startsWith(attributionCookie + '='))?.slice(attributionCookie.length + 1));
}
export function captureAttribution(): Attribution | null {
  if (typeof window === 'undefined' || navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl || new URLSearchParams(location.search).get('browse') === '1') return null;
  const saved = attributionFromCookie(document.cookie);
  if (saved) return saved;
  const q = new URLSearchParams(location.search);
  let threads = false;
  try { threads = /(^|\.)(threads\.com|threads\.net)$/.test(new URL(document.referrer).hostname); } catch { /* Direct visit. */ }
  const source = slug(q.get('utm_source')) || (threads ? 'threads' : 'direct');
  const value: Attribution = { journey_id: crypto.randomUUID(), acquired_at: Date.now(), campaign_source: source, campaign_medium: slug(q.get('utm_medium')) || (threads ? 'social' : 'none'), campaign_name: slug(q.get('utm_campaign')) || 'none' };
  document.cookie = `${attributionCookie}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=2592000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  return value;
}
