'use client';
import { initializeSession } from './client-api';
import { growthProperties, type ClientGrowthEvent } from './growth-events';

export async function trackClient(event: ClientGrowthEvent, properties: Record<string, unknown> = {}, contextId?: string, eventId?: string) {
  if (navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
  if (new URLSearchParams(window.location.search).get('browse') === '1') return;
  try {
    await initializeSession();
    await fetch('/api/analytics/events', { method: 'POST', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, id: eventId || crypto.randomUUID(), properties: growthProperties(properties), contextId }) });
  } catch { /* Measurement never blocks the user. */ }
}
