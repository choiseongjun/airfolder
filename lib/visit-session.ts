const cookieName = 'memonestia_visit';
const timeout = 30 * 60 * 1000;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const slug = (v: unknown) => typeof v === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(v) ? v.toLowerCase() : '';
export type VisitSession = { session_id: string; started_at: number; last_seen: number; session_source: string; session_medium: string; session_campaign: string };

export function sessionFromCookie(cookie: string, now = Date.now()): VisitSession | null {
  try {
    const raw = cookie.split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    const s = JSON.parse(decodeURIComponent(raw || ''));
    if (!uuid.test(s.session_id) || !Number.isFinite(s.started_at) || !Number.isFinite(s.last_seen) || s.started_at > s.last_seen || s.last_seen > now + 300000 || now - s.last_seen >= timeout) return null;
    return { session_id: s.session_id, started_at: Math.min(s.started_at, now), last_seen: Math.min(s.last_seen, now), session_source: slug(s.session_source) || 'direct', session_medium: slug(s.session_medium) || 'none', session_campaign: slug(s.session_campaign) || 'none' };
  } catch { return null; }
}

export function captureVisitSession(): VisitSession | null {
  if (typeof window === 'undefined' || navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl || new URLSearchParams(location.search).get('browse') === '1') return null;
  try {
    const now = Date.now(), q = new URLSearchParams(location.search), saved = sessionFromCookie(document.cookie, now);
    let referrer = 'direct';
    try {
      const host = new URL(document.referrer).hostname;
      if (/(^|\.)(threads\.com|threads\.net)$/.test(host)) referrer = 'threads';
      else if (/(^|\.)(facebook\.com|instagram\.com)$/.test(host)) referrer = 'social';
      else if (host !== location.hostname) referrer = 'referral';
    } catch { /* No external referrer. */ }
    const source = slug(q.get('utm_source')), campaign = slug(q.get('utm_campaign')) || 'none';
    const medium = slug(q.get('utm_medium')) || (source === 'threads' || referrer === 'threads' || referrer === 'social' ? 'social' : 'none');
    const changed = source && saved && (source !== saved.session_source || medium !== saved.session_medium || campaign !== saved.session_campaign);
    const session: VisitSession = saved && !changed ? { ...saved, last_seen: now } : { session_id: crypto.randomUUID(), started_at: now, last_seen: now, session_source: source || referrer, session_medium: medium, session_campaign: campaign };
    document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(session))}; Path=/; Max-Age=1800; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    return session;
  } catch { return null; }
}
