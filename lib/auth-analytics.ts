'use client';
import { firebaseApp } from './firebase-client';
import type { Analytics } from 'firebase/analytics';
import { captureAttribution } from './acquisition';

export const analyticsConsentKey = 'memonestia:analytics-consent';
export const authAnalyticsConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);
let instance: Promise<Analytics | null> | undefined;
export function analyticsAllowed() {
  if (typeof window === 'undefined' || !authAnalyticsConfigured || process.env.NODE_ENV !== 'production') return false;
  if (!['memonestia.xyz', 'www.memonestia.xyz'].includes(location.hostname)) return false;
  if (navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return false;
  try { return localStorage.getItem(analyticsConsentKey) === 'granted' && new URLSearchParams(location.search).get('browse') !== '1'; }
  catch { return false; }
}
export async function setAnalyticsPreference(allowed: boolean) {
  try { localStorage.setItem(analyticsConsentKey, allowed ? 'granted' : 'denied'); } catch { return; }
  if (instance) {
    const analytics = await instance;
    if (analytics) {
      const sdk = await import('firebase/analytics');
      sdk.setConsent({ analytics_storage: allowed ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      sdk.setAnalyticsCollectionEnabled(analytics, analyticsAllowed());
    }
  }
  if (allowed) await trackGaEvent('page_view');
}
export async function trackAuthEvent(event: 'login_start' | 'login' | 'sign_up' | 'login_failed', method: 'google' | 'apple' | 'password' | 'kakao', surface: 'web' | 'app_connect', error?: unknown) {
  captureAttribution();
  if (event === 'login_start' || event === 'login_failed') void import('./growth-client').then(({ trackClient }) => trackClient(event, { method })).catch(() => {});
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const reason = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(code) ? 'cancelled' : code === 'auth/popup-blocked' ? 'popup_blocked' : code === 'auth/network-request-failed' ? 'network' : 'other';
  return trackGaEvent(event, { method, surface, ...(event === 'login_failed' ? { reason } : {}) });
}
export async function trackGaEvent(event: string, properties: Record<string, string> = {}) {
  if (!analyticsAllowed()) return;
  try {
    instance ??= (async () => {
      const sdk = await import('firebase/analytics');
      if (!await sdk.isSupported() || !analyticsAllowed()) return null;
      sdk.setConsent({ analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      return sdk.initializeAnalytics(firebaseApp(), { config: { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: location.origin + '/auth', page_referrer: '', page_title: 'Account connection' } });
    })();
    const analytics = await instance;
    if (!analytics || !analyticsAllowed()) return;
    const { logEvent } = await import('firebase/analytics');
    const a = captureAttribution();
    const campaign = a ? { campaign_source: a.campaign_source, campaign_medium: a.campaign_medium, campaign_name: a.campaign_name } : {};
    logEvent(analytics, event, { ...properties, ...campaign, page_location: location.origin + '/', page_referrer: '', page_title: 'Memonestia' });
  } catch { /* Measurement must never interrupt sign-in. */ }
}
