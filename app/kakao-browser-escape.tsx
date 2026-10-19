'use client';
import { useEffect } from 'react';

// KakaoTalk's in-app browser has an unreliable cookie jar, so sessions started there
// (joining an album, staying signed in) can silently fail. Kicking the page out to the
// device's real browser avoids that, and is the fix Kakao itself documents for this.
export default function KakaoBrowserEscape() {
  useEffect(() => {
    if (!/KAKAOTALK/i.test(navigator.userAgent)) return;
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
  }, []);
  return null;
}
