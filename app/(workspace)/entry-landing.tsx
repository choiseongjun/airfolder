/* eslint-disable @next/next/no-location-assign-relative-destination -- Each action hands off to the workspace or sign-in API with a full navigation. */
"use client";
import { useState } from 'react';
import { EntryScreen } from '@/app/entry-screen';
import { sendNative } from '@/lib/native-bridge';
import { trackAuthEvent } from '@/lib/auth-analytics';
import { GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { api } from '@/lib/client-api';
import { authConfigured, firebaseAuth } from '@/lib/firebase-client';

export default function EntryLanding() {
  const [leaving, setLeaving] = useState(false);
  const [authError, setAuthError] = useState('');
  // The same server-redirect Kakao sign-in as the workspace's account sheet; it returns to / signed in.
  function kakaoLogin() {
    if (sendNative('LOGIN') || leaving) return;
    setLeaving(true);
    void trackAuthEvent('login_start', 'kakao', 'web');
    window.location.assign(`/api/auth/kakao/start?return=${encodeURIComponent('/?lang=ko&home=1')}`);
  }
  async function socialLogin(kind: 'google'|'apple') {
    if (sendNative('LOGIN') || leaving || !authConfigured) return;
    setLeaving(true);setAuthError('');
    void trackAuthEvent('login_start',kind,'web');
    try {
      const auth=firebaseAuth();auth.languageCode='ko';
      const provider=kind==='apple'?new OAuthProvider('apple.com'):new GoogleAuthProvider();
      if(kind==='apple'){provider.addScope('email');provider.addScope('name');provider.setCustomParameters({locale:'ko_KR'});}
      else provider.setCustomParameters({prompt:'select_account'});
      const result=await signInWithPopup(auth,provider);
      try {
        await api('/api/auth/firebase',{method:'POST',body:JSON.stringify({idToken:await result.user.getIdToken()})});
        window.location.assign('/?lang=ko&home=1');
      } finally { await signOut(auth).catch(()=>{}); }
    } catch(error) {
      void trackAuthEvent('login_failed',kind,'web',error);
      const code=error&&typeof error==='object'&&'code' in error?String(error.code):error instanceof Error?error.message:'';
      setAuthError(code==='auth/popup-blocked'?'로그인 팝업을 허용한 뒤 다시 시도해 주세요.':code==='auth/popup-closed-by-user'?'로그인을 취소했어요. 다시 시작할 수 있어요.':code==='auth/account-exists-with-different-credential'?'이미 다른 로그인 방식으로 연결된 계정이에요. 기존 로그인 방식으로 들어와 주세요.':code==='LOGOUT_FIRST'?'다른 계정으로 로그인하려면 먼저 로그아웃해 주세요.':code==='AUTH_NOT_CONFIGURED'||code==='auth/unauthorized-domain'||code==='auth/operation-not-allowed'?'로그인 연결 설정이 아직 완료되지 않았어요.':'로그인을 완료하지 못했어요. 다시 시도해 주세요.');
      setLeaving(false);
    }
  }
  return <EntryScreen
    kakaoDisabled={leaving}
    googleDisabled={leaving||!authConfigured}
    appleDisabled={leaving||!authConfigured}
    authError={authError}
    onKakao={kakaoLogin}
    onGoogle={() => { void socialLogin('google'); }}
    onApple={() => { void socialLogin('apple'); }}
    exploreHref="/browse"
    onJoin={token => window.location.assign(`/join/${token}?lang=ko`)}
  />;
}
