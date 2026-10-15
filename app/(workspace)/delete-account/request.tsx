'use client';
import { useEffect, useState } from 'react';
import { GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase-client';
import { api, initializeSession } from '@/lib/client-api';
import EmailLogin from '../../email-login';

type Workspace = { viewerId: string; account: { name: string; email: string | null; provider: string } | null };
export default function DeleteAccount() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null), [busy, setBusy] = useState(true), [confirmed, setConfirmed] = useState(false), [done, setDone] = useState(false), [error, setError] = useState('');
  const [ko, setKo] = useState(true), [expected, setExpected] = useState('');
  const [receipt, setReceipt] = useState(''), [returnUrl, setReturnUrl] = useState('');
  const t = (kr: string, en: string) => ko ? kr : en;
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    initializeSession().then(() => { setKo(q.get('lang') !== 'en'); setExpected(q.get('viewer') || ''); return api<Workspace>('/api/workspace'); }).then(setWorkspace).catch(() => setError('연결을 확인한 뒤 새로고침해 주세요. / Check your connection and reload.')).finally(() => setBusy(false));
  }, []);
  async function login(apple: boolean) {
    setBusy(true); setError('');
    const auth = firebaseAuth();
    try {
      const provider = apple ? new OAuthProvider('apple.com') : new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await api('/api/auth/firebase', { method: 'POST', body: JSON.stringify({ idToken: await result.user.getIdToken() }) });
      setWorkspace(await api<Workspace>('/api/workspace'));
    } catch { setError(t('로그인을 완료하지 못했어요. 다시 시도해 주세요.', 'Could not sign in. Please retry.')); }
    finally { await signOut(auth); setBusy(false); }
  }
  async function remove() {
    if (!workspace || !confirmed || (expected && expected !== workspace.viewerId)) return;
    setBusy(true); setError('');
    try {
      let credentials = {};
      if (workspace.account?.provider === 'apple.com') {
        const auth = firebaseAuth();
        try {
          const result = await signInWithPopup(auth, new OAuthProvider('apple.com'));
          credentials = { idToken: await result.user.getIdToken(), appleAccessToken: OAuthProvider.credentialFromResult(result)?.accessToken };
        } finally { await signOut(auth); }
      }
      const result = await api<{ receipt: string }>('/api/account', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE', ...credentials }) });
      setReceipt(result.receipt);
      setDone(true);
      const state = new URLSearchParams(location.search).get('state');
      if (state && /^[a-f0-9]{64}$/.test(state)) setReturnUrl(`snaproom://account-deleted?state=${state}`);
    } catch { setError(t('삭제 요청을 완료하지 못했어요. Apple 계정은 같은 Apple 계정으로 본인 확인을 마친 뒤 다시 시도해 주세요.', 'Could not request deletion. For Apple accounts, verify the same Apple account and try again.')); }
    finally { setBusy(false); }
  }
  if (done) return <section><p role="status">{t('삭제 요청이 접수되었습니다. 모든 기기에서 로그아웃되었으며 30일 이내에 삭제를 완료합니다.', 'Deletion requested. All devices are signed out and deletion will be completed within 30 days.')}</p><p><a href={`/delete-account/status#${receipt}`} target="_blank" rel="noreferrer">{t('삭제 처리 결과 확인 · 이 링크를 보관하세요', 'Check deletion status · save this private link')}</a></p>{returnUrl && <a className="primary-button" href={returnUrl}>{t('앱으로 돌아가기', 'Return to app')}</a>}</section>;
  return <section><button className="text-button" onClick={() => setKo(!ko)}>한국어 / English</button>{error && <p role="alert">{error}</p>}
    {workspace?.account ? <><p>{workspace.account.name} · {workspace.account.email}</p>{expected && expected !== workspace.viewerId && <p role="alert">{t('앱에서 사용 중인 계정과 다릅니다. 아래에서 다른 계정으로 로그인해 주세요.', 'This differs from the account in your app. Sign in to the correct account below.')}</p>}
      <button disabled={busy} onClick={async () => { setBusy(true); try { await api('/api/auth/logout', { method: 'POST' }); await initializeSession(); setWorkspace(await api<Workspace>('/api/workspace')); } catch { setError(t('다시 시도해 주세요.', 'Please retry.')); } finally { setBusy(false); } }}>{t('다른 계정 사용', 'Use another account')}</button></> : <><p>{t('삭제할 계정으로 로그인하세요. 게스트 데이터는 아래에서 별도로 삭제할 수 있습니다.', 'Sign in to the account you want to delete. You can also delete this browser’s guest data below.')}</p><div className="social-login"><button disabled={busy} onClick={() => login(false)}>Google</button><button disabled={busy} onClick={() => login(true)}>Apple</button></div><EmailLogin ko={ko} disabled={busy} onSuccess={async () => setWorkspace(await api<Workspace>('/api/workspace'))} /></>}
    <label className="delete-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{t('계정과 관련 데이터의 영구 삭제를 요청합니다. 되돌릴 수 없음을 이해합니다.', 'I request permanent deletion of this account and its data and understand it cannot be undone.')}</label>
    <button className="primary-button" disabled={busy || !confirmed || !workspace || (!!expected && expected !== workspace.viewerId)} onClick={remove}>{workspace?.account ? t('계정 영구 삭제 요청', 'Request permanent account deletion') : t('이 브라우저의 게스트 데이터 삭제', 'Delete this browser’s guest data')}</button>
  </section>;
}
