/* eslint-disable @next/next/no-location-assign-relative-destination -- Each action hands off to the workspace or sign-in API with a full navigation. */
"use client";
import { EntryScreen } from '@/app/entry-screen';
import { sendNative } from '@/lib/native-bridge';

const kakaoEnabled = Boolean(process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY);
// The workspace's account sheet offers every sign-in method this build supports.
const signInSheet = '/?lang=ko&login=1';

export default function EntryLanding() {
  return <EntryScreen
    kakaoDisabled={false}
    appleDisabled={false}
    onKakao={() => { if (sendNative('LOGIN')) return; window.location.assign(kakaoEnabled ? `/api/auth/kakao/start?return=${encodeURIComponent('/')}` : signInSheet); }}
    onApple={() => { if (sendNative('LOGIN')) return; window.location.assign(signInSheet); }}
    exploreHref="/browse"
    onJoin={token => window.location.assign(`/join/${token}?lang=ko`)}
  />;
}
