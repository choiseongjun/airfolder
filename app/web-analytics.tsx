'use client';

import { Analytics } from '@vercel/analytics/next';
import { sanitizeAnalyticsEvent } from '@/lib/web-analytics';
import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureVisitSession } from '@/lib/visit-session';
import { captureAttribution } from '@/lib/acquisition';
import { trackClient } from '@/lib/growth-client';
import { trackGaEvent } from '@/lib/auth-analytics';

export default function WebAnalytics() {
  return <><Suspense fallback={null}><VisitAnalytics /></Suspense><Analytics beforeSend={sanitizeAnalyticsEvent} /></>;
}
function VisitAnalytics() {
  const pathname = usePathname(), params = useSearchParams();
  useEffect(() => {
    const visit = captureVisitSession();
    if (visit) void trackClient('session_started', {}, undefined, visit.session_id);
    const a = captureAttribution();
    if (a) void trackClient('site_visit', {}, undefined, a.journey_id);
    void trackGaEvent('page_view');
    const receipt = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith('memonestia_auth_result='))?.split('=')[1];
    if (receipt) {
      document.cookie = 'memonestia_auth_result=; Path=/; Max-Age=0; SameSite=Lax';
      void trackGaEvent('login', { method: 'kakao' });
      if (receipt === 'signup') void trackGaEvent('sign_up', { method: 'kakao' });
    }
  }, [pathname, params]);
  return null;
}
