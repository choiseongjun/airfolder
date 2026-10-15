'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { TERMS_VERSION } from '@/lib/policy';
import './safety.css';

export default function PolicyGate({ ko }: { ko: boolean }) {
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [checked, setChecked] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const t = (kr: string, en: string) => ko ? kr : en;
  useEffect(() => {
    let active = true;
    api<{ accepted: boolean }>('/api/policy').then(r => { if (active) setAccepted(r.accepted); }).catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [attempt]);
  // Unknown is not the same as declined: never flash the consent dialog on load.
  if (accepted === true) return null;
  if (loadFailed) return <div className="server-banner" role="status">{t('이용 규칙 동의 상태를 확인하지 못했어요.', 'Could not check your terms acceptance.')}<button onClick={() => { setLoadFailed(false); setAttempt(value => value + 1); }}>{t('다시 확인', 'Retry')}</button></div>;
  if (accepted === null) return null;
  return <div className="policy-overlay"><section className="policy-card" role="dialog" aria-modal="true" aria-labelledby="policy-title">
    <h2 id="policy-title">{t('함께 지키는 이용 규칙', 'Before sharing memories')}</h2>
    <p>{t('사진·영상·글을 올리기 전에 이용약관과 커뮤니티 규칙에 동의해 주세요. 성적 착취, 아동 학대, 괴롭힘, 혐오, 불법 콘텐츠와 타인의 권리를 침해하는 콘텐츠는 금지합니다.', 'Before uploading photos, videos or stories, accept our terms and community rules. Sexual exploitation, child abuse, harassment, hate, illegal content and violations of other people’s rights are prohibited.')}</p>
    <p><Link href="/terms" target="_blank">{t('이용약관 · 커뮤니티 규칙', 'Terms & community rules')}</Link> · <Link href="/privacy" target="_blank">{t('개인정보 처리 안내', 'Privacy policy')}</Link></p>
    <label className="policy-consent"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />{t('이용약관과 커뮤니티 규칙에 동의하고 개인정보 처리 안내를 확인했습니다.', 'I accept the terms and community rules and have read the privacy policy.')}</label>
    {error && <p role="alert">{error}</p>}
    <button className="primary-button full" disabled={!checked || busy || accepted === null} onClick={async () => {
      setBusy(true); setError('');
      try { await api('/api/policy', { method: 'POST', body: JSON.stringify({ version: TERMS_VERSION, accepted: true }) }); setAccepted(true); }
      catch { setError(t('저장하지 못했어요. 다시 시도해 주세요.', 'Could not save. Please try again.')); }
      finally { setBusy(false); }
    }}>{t('동의하고 계속', 'Agree and continue')}</button>
    <p><Link href="/delete-account">{t('계정 삭제', 'Delete account')}</Link> · <Link href="/support">{t('문의', 'Support')}</Link></p>
  </section></div>;
}
