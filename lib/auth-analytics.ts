'use client';
import { firebaseApp } from './firebase-client';
import type { Analytics } from 'firebase/analytics';

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
}
export async function trackAuthEvent(event: 'login_start' | 'login' | 'sign_up' | 'login_failed', method: 'google' | 'apple' | 'password', surface: 'web' | 'app_connect', error?: unknown) {
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
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    const reason = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(code) ? 'cancelled' : code === 'auth/popup-blocked' ? 'popup_blocked' : code === 'auth/network-request-failed' ? 'network' : 'other';
    const { logEvent } = await import('firebase/analytics');
    const params = { method, surface, page_location: location.origin + '/auth', page_referrer: '', page_title: 'Account connection' };
    if (event === 'login') logEvent(analytics, 'login', params);
    else if (event === 'sign_up') logEvent(analytics, 'sign_up', params);
    else logEvent(analytics, event, { ...params, ...(event === 'login_failed' ? { reason } : {}) });
  } catch { /* Measurement must never interrupt sign-in. */ }
}
