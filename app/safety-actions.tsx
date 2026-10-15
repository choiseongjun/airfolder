'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import './safety.css';

export default function SafetyActions({ kind, id, ko }: { kind: 'photo' | 'record' | 'comment' | 'user'; id: string; ko: boolean }) {
  const [mode, setMode] = useState<'report' | 'block' | null>(null), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const t = (kr: string, en: string) => ko ? kr : en;
  async function submit() {
    setBusy(true); setNotice('');
    try {
      await api('/api/safety', { method: 'POST', body: JSON.stringify({ action: mode, kind, targetId: id, reason }) });
      if (mode === 'block') { window.location.reload(); return; }
      setMode(null); setReason(''); setNotice(t('운영자에게 신고가 접수됐습니다. 작성자를 차단할 수도 있습니다.', 'Your report was sent to the service operator. You can also block the author.'));
    } catch { setNotice(t('처리하지 못했어요. 다시 시도하거나 도움말에서 문의해 주세요.', 'Could not complete this request. Please retry or contact Support.')); }
    finally { setBusy(false); }
  }
  return <div className="safety-actions">
    <button type="button" disabled={busy} onClick={() => setMode('report')}>{kind === 'user' ? t('사용자 신고', 'Report user') : t('콘텐츠 신고', 'Report content')}</button>
    <button type="button" disabled={busy} onClick={() => setMode('block')}>{kind === 'user' ? t('사용자 차단', 'Block user') : t('작성자 차단', 'Block author')}</button>
    {mode && <form onSubmit={e => { e.preventDefault(); void submit(); }}>
      {mode === 'report' ? <label>{t('신고 사유 · 앨범 소유자가 아닌 서비스 운영자가 검토합니다', 'Reason · reviewed by the service operator, independently of the album owner')}<textarea required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label> : <p>{t('서로의 사진·기록·댓글과 알림을 숨기고 상호작용을 차단합니다. 로그인하지 않은 공개 링크 방문과 이미 내려받은 사본에는 적용되지 않습니다. 내 계정에서 해제할 수 있습니다.', 'Hide each other’s photos, stories, comments and notifications and stop interactions. This does not cover signed-out visits to public links or downloaded copies. You can unblock in Account.')}</p>}
      <button disabled={busy || (mode === 'report' && !reason.trim())}>{mode === 'report' ? t('신고 보내기', 'Send report') : t('차단 확인', 'Confirm block')}</button>
      <button type="button" disabled={busy} onClick={() => setMode(null)}>{t('취소', 'Cancel')}</button>
    </form>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}

export function BlockedUsers({ ko }: { ko: boolean }) {
  const [items, setItems] = useState<{ id: string; name: string }[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; api<{ blocked: typeof items }>('/api/safety').then(r => { if (active) setItems(r.blocked); }).catch(() => { if (active) setError(ko ? '차단 목록을 불러오지 못했어요.' : 'Could not load blocked users.'); }); return () => { active = false; }; }, [ko]);
  return <section className="safety-actions"><h3>{ko ? '차단한 사용자' : 'Blocked users'}</h3>{!items.length && !error && <p>{ko ? '차단한 사용자가 없습니다.' : 'No blocked users.'}</p>}{error && <p role="alert">{error}</p>}{items.map(item => <p key={item.id}>{item.name} <button disabled={busy} onClick={async () => { setBusy(true); try { await api('/api/safety', { method: 'DELETE', body: JSON.stringify({ id: item.id }) }); window.location.reload(); } catch { setError(ko ? '다시 시도해 주세요.' : 'Please retry.'); } finally { setBusy(false); } }}>{ko ? '차단 해제' : 'Unblock'}</button></p>)}</section>;
}
