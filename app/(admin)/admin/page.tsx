'use client';

/* eslint-disable @next/next/no-img-element -- Private previews require the administrator's session cookie and must not enter an image optimization cache. */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Clock3, FileText, LockKeyhole, LogOut, RefreshCw, ShieldCheck, ShieldOff, Trash2, X } from 'lucide-react';

type Session = { username: string; mustChangePassword: boolean };
type Summary = { counts: { reports: number; deletions: number; overdue: number; failed: number; suspended: number; completed: number }; configuration: { firebase: boolean; storage: boolean; scheduleSecret: boolean } };
type Row = { id: string; status?: string; created_at?: string; reason?: string; author_name?: string; kind?: string; name?: string; provider?: string; requested_at?: string; due_at?: string; ready?: boolean; attempts?: number; last_attempt_at?: string; error?: string; suspended_at?: string; action?: string; actor?: string; subject_id?: string; note?: string };
type Detail = { report: Row & { title: string; content: string; author_id: string }; media: { id: string; name: string; kind: string; url: string }[] };
type Tab = 'reports' | 'deletions' | 'suspended' | 'audit';
const tabs = [{ id: 'reports', label: '신고 검토', icon: ShieldCheck }, { id: 'deletions', label: '계정 삭제', icon: Trash2 }, { id: 'suspended', label: '이용 정지', icon: ShieldOff }, { id: 'audit', label: '작업 이력', icon: FileText }] as const;
const kindLabels: Record<string, string> = { photo: '사진·영상', record: '기록', comment: '댓글', user: '사용자' };
const actionLabels: Record<string, string> = { login: '관리자 로그인', logout: '관리자 로그아웃', password_changed: '비밀번호 변경', provisioned: '관리자 계정 생성', report_hide: '콘텐츠 숨김', report_dismiss: '신고 기각', report_suspend: '작성자 이용 정지', report_restore: '숨김 해제', account_unsuspended: '이용 정지 해제', deletion_requested: '계정 삭제 요청 접수', deletion_retried: '계정 삭제 재시도', deletion_started: '계정 삭제 시작', deletion_completed: '계정 삭제 완료', deletion_failed: '계정 삭제 실패' };
const errors: Record<string, string> = { ADMIN_LOGIN_REQUIRED: '로그인이 만료되었습니다. 다시 로그인해 주세요.', INVALID_CREDENTIALS: '아이디 또는 비밀번호를 확인해 주세요.', PASSWORD_CHANGE_REQUIRED: '초기 비밀번호를 먼저 변경해 주세요.', TOO_MANY_ATTEMPTS: '시도가 너무 많습니다. 15분 후 다시 시도해 주세요.', PASSWORD_REQUIREMENTS: '기존과 다른 비밀번호를 16자 이상 입력해 주세요. 최대 256바이트입니다.', REVIEW_NOTE_REQUIRED: '처리 사유를 입력해 주세요.', REPORT_ALREADY_REVIEWED: '이미 처리된 신고입니다. 목록을 새로고침해 주세요.', DELETION_ALREADY_RUNNING: '다른 삭제 작업이 진행 중입니다. 잠시 후 확인해 주세요.', DELETION_NOT_READY: '삭제 요청 후 5분이 지나야 처리할 수 있습니다. 이미 완료된 요청일 수도 있습니다.', STORAGE_DELETE_FAILED: '사진·영상 파일 삭제에 실패했습니다. 재시도하면 남은 파일부터 처리합니다.', FIREBASE_DELETE_FAILED: 'Google·Apple 로그인 계정 삭제에 실패했습니다. 서버 권한을 확인한 뒤 재시도해 주세요.', KAKAO_UNLINK_FAILED: '카카오 계정 연결 끊기에 실패했습니다. KAKAO_ADMIN_KEY를 확인한 뒤 재시도해 주세요.',FIREBASE_ADMIN_NOT_CONFIGURED: 'Firebase 관리 자격 증명 설정이 필요합니다.', DELETION_RETRY_REQUIRED: '외부 서비스 또는 삭제 처리에 실패했습니다. 설정을 확인한 뒤 재시도해 주세요.', ACCOUNT_NOT_SUSPENDED: '이미 정지가 해제되었거나 삭제 중인 계정입니다.' };
class AdminError extends Error { constructor(public code: string) { super(errors[code] || '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'); } }
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api/admin/' + path, { method, credentials: 'same-origin', cache: 'no-store', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new AdminError(data.error || 'SERVER_ERROR');
  return data;
}
const date = (value?: string) => value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null), [checking, setChecking] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null), [tab, setTab] = useState<Tab>('reports'), [status, setStatus] = useState('open'), [auditCategory, setAuditCategory] = useState('all'), [offset, setOffset] = useState(0), [revision, setRevision] = useState(0);
  const [rows, setRows] = useState<Row[]>([]), [hasMore, setHasMore] = useState(false), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null), [note, setNote] = useState(''), [showMedia, setShowMedia] = useState(false), [passwordPanel, setPasswordPanel] = useState(false);
  const detailSequence = useRef(0);
  const onError = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : '네트워크 연결을 확인해 주세요.');
    if (cause instanceof AdminError && cause.code === 'ADMIN_LOGIN_REQUIRED') { setSession(null); setDetail(null); setRows([]); setSummary(null); }
    if (cause instanceof AdminError && cause.code === 'PASSWORD_CHANGE_REQUIRED') setPasswordPanel(true);
  }, []);
  useEffect(() => { let active = true; api<Session>('session').then(s => { if (active) setSession(s); }).catch(e => { if (active && !(e instanceof AdminError && e.code === 'ADMIN_LOGIN_REQUIRED')) onError(e); }).finally(() => { if (active) setChecking(false); }); return () => { active = false; }; }, [onError]);
  useEffect(() => {
    if (!session || session.mustChangePassword) return;
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [counts, list] = await Promise.all([api<Summary>('summary'), api<{ items: Row[]; hasMore: boolean }>(tab === 'reports' ? `reports?status=${status}&offset=${offset}` : `operations?view=${tab}&offset=${offset}&category=${auditCategory}`)]);
        if (active) { setSummary(counts); setRows(list.items); setHasMore(list.hasMore); }
      } catch (cause) { if (active) onError(cause); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [session, tab, status, auditCategory, offset, revision, onError]);
  const refresh = () => setRevision(value => value + 1);
  const chooseTab = (next: Tab) => { detailSequence.current++; setTab(next); setOffset(0); setRows([]); setDetail(null); setError(''); setMessage(''); };
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form); setBusy(true); setError(''); setMessage('');
    try { const s = await api<Session>('session', 'POST', { username: data.get('username'), password: data.get('password') }); form.reset(); setSession(s); setPasswordPanel(false); }
    catch (cause) { onError(cause); } finally { setBusy(false); }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
    if (data.get('password') !== data.get('repeat')) { setError('새 비밀번호가 일치하지 않습니다.'); return; }
    setBusy(true); setError('');
    try { await api('password', 'POST', { currentPassword: data.get('currentPassword'), password: data.get('password') }); form.reset(); setSession(null); setSummary(null); setRows([]); setDetail(null); setPasswordPanel(false); setMessage('비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.'); }
    catch (cause) { onError(cause); } finally { setBusy(false); }
  }
  async function logout() { setBusy(true); try { await api('session', 'DELETE'); setSession(null); setRows([]); setDetail(null); setSummary(null); setMessage('로그아웃했습니다.'); } catch (cause) { onError(cause); } finally { setBusy(false); } }
  async function openReport(id: string) {
    const sequence = ++detailSequence.current; setBusy(true); setError('');
    try { const data = await api<Detail>('reports?id=' + id); if (sequence === detailSequence.current) { setDetail(data); setNote(''); setShowMedia(false); } }
    catch (cause) { onError(cause); } finally { setBusy(false); }
  }
  async function review(action: string) {
    if (!detail || !note.trim()) { setError('처리 사유를 입력해 주세요.'); return; }
    const labels: Record<string, string> = { hide: '해당 콘텐츠를 숨깁니다. 사용자 신고라면 이용을 정지합니다.', dismiss: '신고를 기각합니다.', suspend: '해당 콘텐츠를 숨기고 작성자의 이용을 정지합니다.', restore: '콘텐츠 숨김을 해제합니다. 사진·기록은 비공개로 유지되며 계정 정지는 별도로 해제해야 합니다.' };
    if (!window.confirm(labels[action] + '\n입력한 사유와 처리 결과가 작업 이력에 기록됩니다.')) return;
    setBusy(true); setError('');
    try { await api('reports', 'POST', { id: detail.report.id, action, note }); setDetail(null); setMessage('신고를 처리했습니다.'); refresh(); }
    catch (cause) { onError(cause); } finally { setBusy(false); }
  }
  async function deletions(id?: string) {
    if (!window.confirm('본인이 이미 삭제를 요청한 계정만 처리합니다. 계정·사진·영상·기록이 영구 삭제되며 되돌릴 수 없습니다.\n' + (id ? '선택한 요청을 처리할까요?' : '가장 오래된 요청부터 최대 10건을 처리할까요?'))) return;
    setBusy(true); setError(''); setMessage('삭제를 처리하고 있습니다. 이 화면에서 결과를 기다려 주세요.');
    try {
      const response = await fetch('/api/admin/deletions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, confirm: 'PROCESS_REQUESTED_DELETIONS' }) });
      const data = await response.json();
      if (data.error) throw new AdminError(data.error);
      setMessage(`삭제 완료 ${data.completed}건 · 실패 ${data.failed}건 · 남은 요청 ${data.pending}건`); refresh();
    } catch (cause) { onError(cause); setMessage(''); refresh(); } finally { setBusy(false); }
  }
  async function unsuspend(row: Row) {
    const reason = window.prompt(`${row.name} 계정의 이용 정지를 해제하는 사유를 입력하세요. 숨겨진 콘텐츠는 별도로 해제해야 합니다.`);
    if (!reason?.trim()) return;
    setBusy(true); setError('');
    try { await api('suspensions', 'POST', { id: row.id, action: 'unsuspend', note: reason }); setMessage('이용 정지를 해제했습니다.'); refresh(); }
    catch (cause) { onError(cause); } finally { setBusy(false); }
  }
  const notices = <>{error && <div className="admin-notice danger" role="alert">{error}</div>}{message && <div className="admin-notice success" role="status">{message}</div>}</>;
  if (checking) return <main className="admin-login"><ShieldCheck size={30}/><p>관리자 세션을 확인하고 있습니다.</p></main>;
  if (!session) return <main className="admin-login"><Link className="admin-wordmark" href="/">memonestia<span>운영 관리</span></Link><div className="admin-login-card"><div className="admin-lock"><LockKeyhole size={24}/></div><h1>관리자 로그인</h1><p>신고와 삭제 요청을 안전하게 처리하세요.</p>{notices}<form onSubmit={login}><label>관리자 아이디<input name="username" required autoComplete="username" maxLength={64} autoCapitalize="none" spellCheck={false}/></label><label>비밀번호<input name="password" type="password" required autoComplete="current-password" maxLength={256}/></label><button className="admin-primary" disabled={busy}>{busy ? '확인 중…' : '로그인'}</button></form><small>관리자에게 발급된 계정으로만 접속할 수 있습니다.</small></div><Link href="/support">서비스 도움말 <ArrowUpRight size={13}/></Link></main>;
  const passwordForm = <section className="admin-password-card"><LockKeyhole size={26}/><h2>{session.mustChangePassword ? '초기 비밀번호를 변경해 주세요' : '관리자 비밀번호 변경'}</h2><p>16자 이상을 사용하세요. 변경하면 모든 관리자 로그인 세션이 종료됩니다.</p><form onSubmit={changePassword}><label>현재 비밀번호<input name="currentPassword" type="password" required autoComplete="current-password" maxLength={256}/></label><label>새 비밀번호<input name="password" type="password" required minLength={16} maxLength={256} autoComplete="new-password"/></label><label>새 비밀번호 확인<input name="repeat" type="password" required minLength={16} maxLength={256} autoComplete="new-password"/></label><div className="admin-actions"><button className="admin-primary" disabled={busy}>비밀번호 변경</button>{!session.mustChangePassword && <button type="button" onClick={() => setPasswordPanel(false)}>취소</button>}</div></form></section>;
  return <div className="admin-shell"><aside className="admin-sidebar"><Link href="/" className="admin-wordmark">memonestia<span>ADMIN CONSOLE</span></Link><div className="admin-workspace-label">서비스 운영</div><nav aria-label="관리자 메뉴">{tabs.map(({ id, label, icon: Icon }) => <button key={id} aria-current={tab === id ? 'page' : undefined} disabled={busy || session.mustChangePassword} onClick={() => { setPasswordPanel(false); chooseTab(id); }}><Icon size={18}/>{label}{id === 'reports' && !!summary?.counts.reports && <b>{summary.counts.reports}</b>}</button>)}</nav><div className="admin-sidebar-foot"><ShieldCheck size={17}/><span>관리자 전용<br/><small>모든 처리 내역이 기록됩니다.</small></span></div></aside><main className="admin-main"><header className="admin-header"><div><span className="admin-eyebrow">MEMONESTIA / TRUST & SAFETY</span><h1>{session.mustChangePassword || passwordPanel ? '계정 보안' : tabs.find(t => t.id === tab)?.label}</h1></div><div className="admin-header-actions"><span>{session.username}</span><button aria-label="새로고침" title="새로고침" onClick={refresh} disabled={busy || loading || session.mustChangePassword}><RefreshCw size={18}/></button><button aria-label="비밀번호 변경" title="비밀번호 변경" onClick={() => { setError(''); setMessage(''); setPasswordPanel(true); }} disabled={busy}><LockKeyhole size={18}/></button><button aria-label="로그아웃" title="로그아웃" onClick={logout} disabled={busy}><LogOut size={18}/></button></div></header>{notices}{session.mustChangePassword || passwordPanel ? passwordForm : <>{summary && <><div className="admin-stats">{[['검토 대기', summary.counts.reports, 'reports'], ['삭제 대기', summary.counts.deletions, 'deletions'], ['삭제 실패', summary.counts.failed, 'deletions'], ['기한 초과', summary.counts.overdue, 'deletions']].map(([label, count, target]) => <button key={label} onClick={() => chooseTab(target as Tab)} className={Number(count) > 0 && ['삭제 실패','기한 초과'].includes(String(label)) ? 'attention' : ''}><span>{label}</span><strong>{count}</strong><small>{label === '기한 초과' ? '요청 후 30일 경과' : label === '검토 대기' ? '아래에서 신고를 검토하세요' : label === '삭제 실패' ? '원인 확인 후 재시도' : '본인이 확인한 삭제 요청'}</small></button>)}</div>{(!summary.configuration.firebase || !summary.configuration.storage || !summary.configuration.scheduleSecret) && <div className="admin-notice warning"><strong>삭제 운영 설정을 확인해 주세요.</strong><span>{!summary.configuration.firebase && 'Firebase 관리 자격 증명 미설정: Google·Apple 회원 삭제는 완료할 수 없습니다. '}{!summary.configuration.storage && '파일 저장소 연결이 필요합니다. '}{!summary.configuration.scheduleSecret && '자동 삭제 실행 키가 설정되지 않았습니다. '}</span><small>설정이 완료된 요청만 처리됩니다. 키와 비밀번호를 신고 메모에 입력하지 마세요.</small></div>}</>}
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>{tab === 'reports' ? '접수된 신고' : tab === 'deletions' ? '계정 삭제 요청' : tab === 'suspended' ? '이용 정지 계정' : '최근 30일 작업 이력'}</h2><p>{tab === 'reports' ? '신고 사유와 콘텐츠를 확인한 뒤 조치하세요.' : tab === 'deletions' ? '요청 후 5분이 지난 계정부터 처리합니다. 실패한 요청은 보존됩니다.' : tab === 'suspended' ? '이의 제기를 검토하고 필요한 경우 정지를 해제하세요.' : '관리자와 자동 작업의 처리 결과를 확인할 수 있습니다.'}</p></div>{tab === 'reports' && <select aria-label="신고 상태" value={status} disabled={busy} onChange={e => { setStatus(e.target.value); setOffset(0); setDetail(null); }}><option value="open">검토 대기</option><option value="hidden">숨김·정지</option><option value="dismissed">기각·숨김 해제</option></select>}{tab === 'audit' && <select aria-label="작업 이력 종류" value={auditCategory} disabled={busy} onChange={e => { setAuditCategory(e.target.value); setOffset(0); }}><option value="all">전체 이력</option><option value="deletion">계정 삭제</option><option value="moderation">신고·이용 정지</option><option value="access">관리자 접속·보안</option></select>}{tab === 'deletions' && <button className="admin-primary" disabled={busy || !summary?.counts.deletions} onClick={() => deletions()}><Trash2 size={15}/>{busy ? '처리 중…' : '대기 요청 처리'}</button>}</div>
    {loading ? <div className="admin-empty"><Clock3/><p>목록을 불러오고 있습니다.</p></div> : rows.length === 0 ? <div className="admin-empty"><Check size={30}/><h3>{tab === 'reports' ? '해당 상태의 신고가 없습니다' : tab === 'deletions' ? '대기 중인 삭제 요청이 없습니다' : tab === 'suspended' ? '정지된 계정이 없습니다' : '아직 기록된 작업이 없습니다'}</h3><p>새 요청은 새로고침하면 확인할 수 있습니다.</p></div> : <div className="admin-list">{rows.map(row => <article key={row.id} className="admin-row">{tab === 'reports' ? <><div className="admin-row-icon"><ShieldCheck size={19}/></div><div className="admin-row-content"><span className="admin-tag">{kindLabels[row.kind || '']}</span><h3>{row.reason}</h3><p>{row.author_name} · {date(row.created_at)}</p><code>{row.id}</code></div><button disabled={busy} onClick={() => openReport(row.id)}>검토하기 <ChevronRight size={16}/></button></> : tab === 'deletions' ? <><div className="admin-row-icon"><Trash2 size={19}/></div><div className="admin-row-content"><h3>{row.name} <span className="admin-tag">{row.provider}</span></h3><p>요청 {date(row.requested_at)} · 처리 기한 {date(row.due_at)}</p><p>{row.attempts}회 시도{row.last_attempt_at && ` · 마지막 시도 ${date(row.last_attempt_at)}`}</p>{row.error && <p className="admin-error-text">{errors[row.error] || '처리 실패: 재시도가 필요합니다.'}</p>}<code>{row.id}</code></div><button disabled={busy || !row.ready || (row.provider !== 'guest' && !summary?.configuration.firebase) || !summary?.configuration.storage} onClick={() => deletions(row.id)}>{row.ready ? row.error ? '재시도' : '삭제 처리' : '5분 대기'}</button></> : tab === 'suspended' ? <><div className="admin-row-icon"><ShieldOff size={19}/></div><div className="admin-row-content"><h3>{row.name}</h3><p>정지 {date(row.suspended_at)}</p><code>{row.id}</code></div><button disabled={busy} onClick={() => unsuspend(row)}>정지 해제</button></> : <><div className="admin-row-icon"><FileText size={19}/></div><div className="admin-row-content"><h3>{actionLabels[row.action || ''] || row.action}</h3><p>{row.actor} · {date(row.created_at)}</p>{row.note && <p className="admin-audit-note">{errors[row.note] || row.note}</p>}{row.subject_id && <code>{row.subject_id}</code>}</div></>}</article>)}</div>}
    <footer className="admin-pagination"><span>{Math.floor(offset / 50) + 1}페이지 · 최대 50건{tab === 'audit' && ' · 30일 보관'}</span><div><button aria-label="이전 페이지" disabled={offset === 0 || busy || loading} onClick={() => setOffset(Math.max(0, offset - 50))}><ChevronLeft size={17}/></button><button aria-label="다음 페이지" disabled={!hasMore || busy || loading} onClick={() => setOffset(offset + 50)}><ChevronRight size={17}/></button></div></footer></section><footer className="admin-footer"><span>Memonestia 운영 관리</span><Link href="/admin/analytics">사용 지표 <ArrowUpRight size={13}/></Link><Link href="/terms">커뮤니티 규칙 <ArrowUpRight size={13}/></Link></footer></>}
    </main>{detail && <div className="admin-detail-backdrop"><section className="admin-detail" role="dialog" aria-modal="true" aria-labelledby="admin-report-title"><header><div><span className="admin-eyebrow">REPORT REVIEW</span><h2 id="admin-report-title">신고 검토</h2></div><button aria-label="신고 상세 닫기" disabled={busy} onClick={() => setDetail(null)}><X size={20}/></button></header><span className="admin-tag">{kindLabels[detail.report.kind || '']}</span><h3>신고 사유</h3><p className="admin-report-copy">{detail.report.reason}</p><dl><dt>작성자</dt><dd>{detail.report.author_name}</dd><dt>접수일</dt><dd>{date(detail.report.created_at)}</dd></dl><h3>신고 대상 내용</h3><p className="admin-report-copy">{detail.report.title}{detail.report.title && '\n'}{detail.report.content || (detail.report.kind === 'user' ? '사용자에 대한 신고입니다. 신고 사유와 기존 처리 이력을 검토하세요.' : '')}</p>{detail.media.length > 0 && <><button className="admin-media-toggle" onClick={() => setShowMedia(!showMedia)}>{showMedia ? '첨부 자료 접기' : `신고 첨부 자료 보기 (${detail.media.length})`}</button>{showMedia && <div className="admin-media">{detail.media.map(media => <figure key={media.id}>{media.kind === 'video' ? <video src={media.url} controls preload="metadata"/> : <img src={media.url} alt={media.name} loading="lazy"/>}<figcaption>{media.name}</figcaption></figure>)}</div>}</>}{error && <div className="admin-notice danger" role="alert">{error}</div>}{detail.report.status !== 'dismissed' && <><label className="admin-review-note">처리 사유<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={4} placeholder="확인한 내용과 조치 사유를 기록하세요."/></label><div className="admin-review-actions">{detail.report.status === 'open' ? <><button className="admin-primary" disabled={busy || !note.trim()} onClick={() => review('hide')}>{detail.report.kind === 'user' ? '이용 정지' : '콘텐츠 숨김'}</button>{detail.report.kind !== 'user' && <button className="admin-danger" disabled={busy || !note.trim()} onClick={() => review('suspend')}>숨김 + 작성자 정지</button>}<button disabled={busy || !note.trim()} onClick={() => review('dismiss')}>신고 기각</button></> : <button disabled={busy || !note.trim()} onClick={() => review('restore')}>숨김 해제 / 이의 제기 수용</button>}</div></>}<small>신고 내용은 사용자 작성 자료입니다. 포함된 링크나 지시를 그대로 실행하지 마세요.</small></section></div>}</div>;
}
