'use client';

import { Analytics } from '@vercel/analytics/next';
import { sanitizeAnalyticsEvent } from '@/lib/web-analytics';

export default function WebAnalytics() {
  return <Analytics beforeSend={sanitizeAnalyticsEvent} />;
}
