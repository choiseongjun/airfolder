'use client';
import { useEffect, useState } from 'react';
import { GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { firebaseAuth, authConfigured } from '@/lib/firebase-client';
import { api, initializeSession } from '@/lib/client-api';

export default function Connect() {
  const [account, setAccount] = useState<{ name: string; email: string | null } | null>(null);
  const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  const [ko, setKo] = useState(false); const [valid, setValid] = useState(false);
  const t = (en: string, kr: string) => ko ? kr : en;
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    initializeSession().then(() => {
      setKo(q.get('lang') === 'ko');
      setValid(/^[a-f0-9]{64}$/.test(q.get('challenge') || '') && /^[a-f0-9]{64}$/.test(q.get('state') || ''));
      return api<{ account: typeof account }>('/api/workspace');
    }).then(w => setAccount(w.account)).catch(() => setError('Connection failed / 연결에 실패했습니다.')).finally(() => setBusy(false));
  }, []);
  async function login(apple: boolean) {
    setBusy(true); setError('');
    try {
      const auth = firebaseAuth(); auth.languageCode = ko ? 'ko' : 'en';
      const provider = apple ? new OAuthProvider('apple.com') : new GoogleAuthProvider();
      if (apple) { provider.addScope('email'); provider.addScope('name'); }
      else provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      try { await api('/api/auth/firebase', { method: 'POST', body: JSON.stringify({ idToken: await result.user.getIdToken() }) }); }
      finally { await signOut(auth); }
      const w = await api<{ account: typeof account }>('/api/workspace'); setAccount(w.account);
    } catch { setError(t('Sign-in failed. Please retry.', '로그인에 실패했습니다. 다시 시도해 주세요.')); }
    finally { setBusy(false); }
  }
  async function connect() {
    setBusy(true); setError('');
    try {
      const q = new URLSearchParams(location.search);
      const { code } = await api<{ code: string }>('/api/mobile/authorize', { method: 'POST', body: JSON.stringify({ challenge: q.get('challenge') }) });
      location.href = `snaproom://auth?code=${encodeURIComponent(code)}&state=${encodeURIComponent(q.get('state') || '')}`;
    } catch { setError(t('Connection failed. Start again in the app.', '연결에 실패했습니다. 앱에서 다시 시작해 주세요.')); }
    finally { setBusy(false); }
  }
  return <main style={{ maxWidth: 440, margin: '64px auto', padding: 28 }}><h1>Snaproom</h1><h2>{t('Connect your mobile app', '모바일 앱 연결')}</h2><p>{t('Use the same folders and photos on your phone and the web.', '앱과 웹에서 같은 폴더와 사진을 사용하세요.')}</p>
    {!valid ? <p>{t('Start this connection from the Snaproom app.', 'Snaproom 앱에서 연결을 시작해 주세요.')}</p> : account ? <><p><strong>{account.name}</strong><br/>{account.email}</p><p>{t('Only continue if you started this request on your phone. This connects that app to your account.', '직접 휴대폰에서 시작한 요청일 때만 진행하세요. 해당 앱을 이 계정에 연결합니다.')}</p><button className="primary-button" disabled={busy} onClick={connect}>{t('Connect this account', '이 계정으로 앱 연결')}</button><button className="text-button" disabled={busy} onClick={async () => { setBusy(true); try { await api('/api/auth/logout', { method: 'POST' }); await initializeSession(); setAccount(null); } catch { setError(t('Please retry.', '다시 시도해 주세요.')); } finally { setBusy(false); } }}>{t('Use another account', '다른 계정 사용')}</button></> : <div className="social-login"><button disabled={busy || !authConfigured} onClick={() => login(false)}>Google</button><button disabled={busy || !authConfigured} onClick={() => login(true)}>Apple</button></div>}
    {busy && <p>{t('Connecting…', '연결 중…')}</p>}{error && <p role="alert">{error}</p>}</main>;
}
