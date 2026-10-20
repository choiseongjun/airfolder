/* eslint-disable @next/next/no-location-assign-relative-destination -- Each action hands off to the workspace or sign-in API with a full navigation. */
"use client";
import { useState } from 'react';
import { EntryScreen } from '@/app/entry-screen';
import { sendNative } from '@/lib/native-bridge';
import { trackAuthEvent } from '@/lib/auth-analytics';

// The workspace's account sheet offers every sign-in method this build supports.
const signInSheet = '/?lang=ko&login=1';

export default function EntryLanding() {
  const [leaving, setLeaving] = useState(false);
  // The same server-redirect Kakao sign-in as the workspace's account sheet; it returns to / signed in.
  function kakaoLogin() {
    if (sendNative('LOGIN') || leaving) return;
    setLeaving(true);
    void trackAuthEvent('login_start', 'kakao', 'web');
    window.location.assign(`/api/auth/kakao/start?return=${encodeURIComponent('/')}`);
  }
  return <EntryScreen
    kakaoDisabled={leaving}
    appleDisabled={leaving}
    onKakao={kakaoLogin}
    onApple={() => { if (sendNative('LOGIN')) return; window.location.assign(signInSheet); }}
    exploreHref="/browse"
    onJoin={token => window.location.assign(`/join/${token}?lang=ko`)}
  />;
}
