'use client';
import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { analyticsConsentKey, authAnalyticsConfigured, setAnalyticsPreference } from '@/lib/auth-analytics';

function subscribeConsent(notify: () => void) {
  window.addEventListener('storage', notify);
  return () => window.removeEventListener('storage', notify);
}
function readConsent() {
  try { return localStorage.getItem(analyticsConsentKey) === 'granted'; } catch { return false; }
}
export default function AnalyticsPreference({ ko = false }: { ko?: boolean }) {
  const stored = useSyncExternalStore(subscribeConsent, readConsent, () => false);
  const [choice, setEnabled] = useState<boolean | null>(null);
  const enabled = choice ?? stored;
  if (!authAnalyticsConfigured) return null;
  return <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '16px 0', fontSize: 13, lineHeight: 1.5 }}><input type="checkbox" checked={enabled} onChange={e => { setEnabled(e.target.checked); void setAnalyticsPreference(e.target.checked); }} /><span>{ko ? '선택: 방문·유입 경로·로그인·가입·앨범 생성·초대 이용 통계를 Google Analytics에 보냅니다. 언제든 해제할 수 있어요.' : 'Optional: share visits, campaign attribution, sign-in, sign-up, album creation and invitation statistics with Google Analytics. You can turn this off anytime.'} <Link href="/privacy">{ko ? '자세히' : 'Details'}</Link></span></label>;
}
