'use client';
/* eslint-disable @next/next/no-location-assign-relative-destination -- Authentication requires a full navigation to discard the previous session UI. */
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {GoogleAuthProvider,OAuthProvider,signInWithPopup,signOut} from 'firebase/auth';
import {authConfigured,firebaseAuth} from '@/lib/firebase-client';
import {api,initializeSession} from '@/lib/client-api';
import {sendNative,hasNativeBridge} from '@/lib/native-bridge';
import {trackAuthEvent} from '@/lib/auth-analytics';
import type {Locale} from './i18n';
import EmailLogin from './email-login';
import './keepsake-workspace.css';

export default function KeepsakeLogin({locale}:{locale:Locale}){
 const ko=locale==='ko',t=(a:string,b:string)=>ko?a:b,q=useSearchParams();
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(q.has('loginError')?t('로그인을 완료하지 못했어요. 다시 시도해 주세요.','Could not finish signing in. Please retry.'):''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;initializeSession().then(()=>{if(active)setReady(true);}).catch(()=>{if(active)setError(ko?'연결을 준비하지 못했어요. 다시 시도해 주세요.':'Could not prepare your session. Please retry.');});return()=>{active=false;};},[ko,retry]);
 function destination(){const raw=q.get('returnTo');if(raw){const url=new URL(raw,location.origin);if(url.origin===location.origin&&raw.startsWith('/')&&!raw.startsWith('//')&&!url.searchParams.has('login')&&!url.searchParams.has('loginError'))return url.pathname+url.search;}return `/account?lang=${locale}`;}
 async function complete(){location.replace(destination());}
 async function login(kind:'google'|'apple'){
 if(busy||!ready)return;if(sendNative('LOGIN'))return;setBusy(true);setError('');void trackAuthEvent('login_start',kind,'web');
 try{const auth=firebaseAuth();auth.languageCode=locale;const provider=kind==='apple'?new OAuthProvider('apple.com'):new GoogleAuthProvider();if(kind==='apple'){provider.addScope('email');provider.addScope('name');provider.setCustomParameters({locale:ko?'ko_KR':'en_US'});}else provider.setCustomParameters({prompt:'select_account'});
 const result=await signInWithPopup(auth,provider);try{await api('/api/auth/firebase',{method:'POST',body:JSON.stringify({idToken:await result.user.getIdToken()})});}finally{await signOut(auth).catch(()=>{});}await complete();
 }catch(e){void trackAuthEvent('login_failed',kind,'web',e);const code=e&&typeof e==='object'&&'code' in e?String(e.code):e instanceof Error?e.message:'';setError(code==='auth/popup-blocked'?t('로그인 팝업을 허용하고 다시 시도해 주세요.','Allow sign-in popups and try again.'):code==='auth/popup-closed-by-user'?t('로그인을 취소했어요. 언제든 다시 연결할 수 있어요.','Sign-in cancelled. You can try again anytime.'):code==='LOGOUT_FIRST'?t('다른 계정으로 연결하려면 먼저 로그아웃해 주세요.','Sign out before connecting another account.'):t('로그인을 완료하지 못했어요. 기존에 사용한 로그인 방법으로 다시 시도해 주세요.','Could not finish signing in. Retry using your original sign-in method.'));}finally{setBusy(false);}
 }
 return <main className="bookdesk"><header className="bookdesk-header"><Link className="bookdesk-brand" href={`/?home=1&lang=${locale}`}>memonestia</Link><Link href={`/account?lang=${locale}`}>{t('돌아가기','Back')}</Link></header><div className="bookdesk-content bookdesk-login"><span className="bookdesk-eyebrow">KEEP YOUR STORIES CLOSE</span><h1>{t('어디서든, 나의 추억책.','Your books, wherever you are.')}</h1><p>{t('지금 만든 기록을 다음에도 찾을 수 있도록 계정을 연결하세요.','Connect an account to find your stories again, on another device too.')}</p><section className="bookdesk-panel">{ko&&process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY&&<button className="bookdesk-secondary" disabled={busy||!ready} onClick={()=>{if(sendNative('LOGIN'))return;setBusy(true);void trackAuthEvent('login_start','kakao','web');location.assign(`/api/auth/kakao/start?return=${encodeURIComponent(destination())}`);}}>카카오로 계속하기</button>}<button className="bookdesk-primary" disabled={busy||!ready||!authConfigured} onClick={()=>void login('google')}>{t('Google로 계속하기','Continue with Google')}</button><button className="bookdesk-secondary" disabled={busy||!ready||!authConfigured} onClick={()=>void login('apple')}>{t('Apple로 계속하기','Continue with Apple')}</button>{!hasNativeBridge()&&<EmailLogin ko={ko} disabled={busy||!ready} onSuccess={complete}/>}<p>{t('현재 게스트 기록이 선택한 계정으로 연결됩니다. 본인의 계정인지 확인해 주세요.','Your guest collection will be connected to the account you choose. Make sure it is yours.')}</p>{!authConfigured&&<p>{t('현재 소셜 로그인 연결을 사용할 수 없어요. 게스트 제작과 다운로드는 가능합니다.','Social sign-in is currently unavailable. You can still create and download as a guest.')}</p>}{error&&<p role="alert">{error}</p>}{!ready&&error&&<button onClick={()=>{setError('');setRetry(v=>v+1);}}>{t('다시 연결','Retry connection')}</button>}</section></div></main>;
}
