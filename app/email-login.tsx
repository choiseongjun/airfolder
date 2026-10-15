'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { authConfigured, firebaseAuth } from '@/lib/firebase-client';
import { api } from '@/lib/client-api';

export default function EmailLogin({ ko, disabled = false, onSuccess }: { ko: boolean; disabled?: boolean; onSuccess: () => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <details style={{ marginTop: 20 }}><summary>{ko ? '초대받은 이메일 계정으로 로그인' : 'Sign in with an invited email account'}</summary>
    <form style={{ display: 'grid', gap: 12, marginTop: 12 }} onSubmit={async event => {
      event.preventDefault(); if (busy || disabled) return;
      setBusy(true); setError('');
      try {
        const auth = firebaseAuth();
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        try { await api('/api/auth/firebase', { method: 'POST', body: JSON.stringify({ idToken: await result.user.getIdToken() }) }); }
        finally { await signOut(auth); }
        setPassword(''); await onSuccess();
      } catch { setError(ko ? '로그인하지 못했습니다. 발급받은 계정 정보를 확인해 주세요.' : 'Could not sign in. Check your issued account credentials.'); }
      finally { setBusy(false); }
    }}>
      <label>{ko ? '이메일' : 'Email'}<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: 12 }} /></label>
      <label>{ko ? '비밀번호' : 'Password'}<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 12 }} /></label>
      <button className="primary-button" disabled={disabled || busy || !authConfigured}>{busy ? (ko ? '연결 중…' : 'Connecting…') : (ko ? '로그인' : 'Sign in')}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </details>;
}
