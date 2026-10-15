import type { BeforeSendEvent } from '@vercel/analytics/next';

export function sanitizeAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  if (typeof navigator !== 'undefined' && (
    navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
  )) return null;

  try {
    const url = new URL(event.url);
    // Share/invite tokens and temporary credentials must not appear in page URLs.
    url.pathname = url.pathname.replace(/^\/(s|join)\/[^/]+(?=\/|$)/, '/$1/[token]');
    url.search = '';
    url.hash = '';
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}
