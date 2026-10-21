'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import type { GrowthReport } from '@/lib/growth-report';
import './analytics.css';
const percent = (n: number, d: number) => d ? `${Math.round(n / d * 100)}%` : '—';
const date = (s: string | null) => s ? new Date(s).toLocaleString('ko-KR') : '아직 없음';
const reasonNames: Record<string, string> = { network: '네트워크', size: '파일 크기', storage: '저장 공간', format: '사진 형식', permission: '접근·동의', other: '기타' };
export default function Analytics() {
  const [days, setDays] = useState(30), [environment, setEnvironment] = useState('production'), [revision, setRevision] = useState(0);
  const [report, setReport] = useState<GrowthReport | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [login, setLogin] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(''); setReport(null); setLogin(false);
      try {
        const response = await fetch(`/api/admin/analytics?days=${days}&environment=${environment}`, { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
        if ([401,403].includes(response.status)) { setLogin(true); return; }
        if (!response.ok) throw new Error();
        setReport(await response.json());
      } catch { if (!controller.signal.aborted) setError('지표를 불러오지 못했어요. 연결 상태와 analytics 마이그레이션 적용 여부를 확인해 주세요.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [days, environment, revision]);
  return <main className="ga-page"><header className="ga-header"><div><Link className="ga-back" href="/admin"><ArrowLeft size={14} /> 운영 관리</Link><p className="ga-eyebrow">MEMONESTIA · GROWTH</p><h1>함께 쓰고 있나요?</h1><p>초대부터 첫 사진까지, 실제 참여로 성장을 확인하세요.</p></div><Link className="ga-public" href="/ko/hosts" target="_blank">모임장 소개페이지<ArrowUpRight size={16} /></Link></header>
    <div className="ga-controls"><label>조회 기간<select value={days} onChange={e => setDays(Number(e.target.value))}>{[7,30,90].map(n => <option key={n} value={n}>최근 {n}일</option>)}</select></label><label>데이터<select value={environment} onChange={e => setEnvironment(e.target.value)}><option value="production">실서비스</option><option value="development">개발·검증</option></select></label><button disabled={loading} onClick={() => setRevision(n => n + 1)}><RefreshCw size={15} />새로고침</button></div>
    {loading && <p role="status">실제 사용 데이터를 불러오고 있어요…</p>}{error && <p className="ga-error" role="alert">{error}</p>}
    {login && <section className="ga-panel"><h2>관리자 로그인이 필요합니다.</h2><p>운영 관리에서 로그인하고 초기 비밀번호 변경을 마친 뒤 돌아와 주세요.</p><Link href="/admin">관리자 로그인 →</Link></section>}
    {report && <>{!report.firstEvent && <div className="ga-empty"><strong>아직 수집된 이벤트가 없습니다.</strong><p>{environment === 'production' ? '실서비스에 배포하고 ANALYTICS_ENVIRONMENT=production을 설정한 뒤, 실제 모임장을 초대해 주세요.' : '소개페이지에서 시작해 초대·업로드 흐름을 검증하면 여기에 표시됩니다.'} 예시 수치는 표시하지 않습니다.</p></div>}
      <section className="ga-panel"><h2>유입 → 로그인·가입 → 앨범 → 초대</h2><p className="ga-muted">첫 유입을 30일 유지합니다. 방문은 브라우저별 유입 여정 수이며, 7일 안에 로그인 후 만든 첫 앨범과 그 앨범·그룹의 초대 링크 생성을 집계합니다. 가입은 로그인 중 신규 계정 수입니다. 초대는 발송·참여를 의미하지 않습니다.</p><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'left', borderSpacing: 12 }}><thead><tr>{['유입','캠페인','방문','로그인','신규 가입','앨범','초대'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{report.acquisition?.map(row => <tr key={`${row.source}:${row.medium}:${row.campaign}`}><td>{row.source} / {row.medium}</td><td>{row.campaign}</td><td>{row.visits}</td><td>{row.logins}</td><td>{row.signups}</td><td>{row.albums}</td><td>{row.invites}</td></tr>)}</tbody></table></div>{!report.acquisition?.length && <p>아직 유입 데이터가 없습니다. 배포 이후 방문부터 집계합니다.</p>}</section>
      <section className="ga-cards" aria-label="핵심 사용 지표">{[
        ['함께 쓰는 앨범', report.activatedAlbums, '3명 이상이 사진을 보태고, 전체 멤버 공유 사진이 20장 이상'],
        ['새 앨범', report.albums, '선택 기간에 생성 이벤트가 관측된, 현재 존재하는 앨범'],
        ['사진을 올린 사람', report.contributors, '저장 성공 기준 · 브라우저/계정 식별자 중복 제거'],
        ['다시 만든 모임장', report.repeatHosts, '기간 내 서로 다른 2일 이상 앨범을 만든 소유자'],
      ].map(([label, value, description]) => <article className="ga-stat" key={String(label)}><span>{label}</span><strong>{value}</strong><p>{description}</p></article>)}</section>
      <div className="ga-grid"><section className="ga-panel"><div className="ga-panel-heading"><h2>초대 → 첫 공유 사진</h2><span>7일 전환 창</span></div><p className="ga-muted">같은 사람이 같은 앨범·그룹에서 순서대로 완료한 참여입니다. 한 사람이 두 모임에 참여하면 2건입니다.</p>
        <Funnel rows={[["초대를 열었어요", report.guestFunnel.opened], ["모임에 참여했어요", report.guestFunnel.joined], ["첫 사진을 공유했어요", report.guestFunnel.uploaded]]} />
        <div className="ga-highlight"><span>초대 → 공유 전환율<strong>{percent(report.guestFunnel.uploaded, report.guestFunnel.opened)}</strong></span><span>첫 공유까지 중앙값<strong>{report.guestFunnel.medianMinutes === null ? '—' : `${Math.round(report.guestFunnel.medianMinutes)}분`}</strong></span></div><p className="ga-muted">최근 초대 {report.guestFunnel.stillMaturing}건은 아직 7일이 지나지 않아 전환이 더 발생할 수 있습니다. 초대를 보낸 횟수는 분모에 포함하지 않습니다.</p></section>
        <section className="ga-panel"><div className="ga-panel-heading"><h2>모임장 소개 → 앨범 생성</h2><span>7일 전환 창</span></div><p className="ga-muted">소개페이지를 본 사람 중 시작 버튼을 누르고, 전용 만들기 화면에서 앨범까지 만든 사람입니다.</p><Funnel rows={[["소개페이지 방문", report.hostFunnel.viewed], ["앨범 만들기 클릭", report.hostFunnel.clicked], ["앨범 생성 완료", report.hostFunnel.created]]} /><div className="ga-highlight"><span>방문 → 생성 전환율<strong>{percent(report.hostFunnel.created, report.hostFunnel.viewed)}</strong></span><span>활성 앨범 비율<strong>{percent(report.activatedAlbums, report.albums)}</strong></span></div></section></div>
      <section className="ga-panel"><div className="ga-panel-heading"><h2>매일 얼마나 쌓이고 있나요?</h2><span>UTC 날짜 · 사진 저장 성공</span></div><div className="ga-chart" role="img" aria-label="일별 저장 성공 사진 수 막대그래프">{report.daily.map(day => <div key={day.date} title={`${day.date}: 사진 ${day.uploads}장, 앨범 ${day.albums}개`}><span style={{ height: `${day.uploads ? Math.max(3, day.uploads / Math.max(1, ...report.daily.map(d => d.uploads)) * 130) : 1}px` }} /><small>{day.date.slice(5)}</small></div>)}</div><details className="ga-table"><summary>일별 수치를 표로 보기</summary><table><thead><tr><th>UTC 날짜</th><th>새 앨범</th><th>저장한 사진</th></tr></thead><tbody>{report.daily.map(day => <tr key={day.date}><td>{day.date}</td><td>{day.albums}</td><td>{day.uploads}</td></tr>)}</tbody></table></details></section>
      <div className="ga-grid"><section className="ga-panel"><h2>업로드가 막히는 곳</h2><p>사진 저장 성공 <strong>{report.uploadSuccesses}건</strong> · 초대 화면 전송 시도 <strong>{report.uploadAttempts}건</strong> · 실패 <strong>{report.uploadFailures}건</strong></p><p className="ga-muted">시도·실패는 초대 화면에서만 수집하며 재시도를 포함합니다. 저장 성공은 앱 전체에서 파일당 한 번 기록하므로 이 수치들로 성공률을 나누지 않습니다.</p>{report.failures.length ? <ul className="ga-failures">{report.failures.map(f => <li key={f.reason}><span>{reasonNames[f.reason] || '기타'}</span><strong>{f.count}건</strong></li>)}</ul> : <p className="ga-muted">관측된 업로드 실패가 없습니다.</p>}</section>
        <section className="ga-panel"><h2>수집 상태</h2><dl className="ga-health"><div><dt>PostHog 설정</dt><dd>{report.posthogConfigured ? '연결 정보 설정됨' : '프로젝트 키·호스트 설정 필요'}</dd></div><div><dt>마지막 이벤트</dt><dd>{date(report.lastEvent)}</dd></div><div><dt>PostHog 마지막 전송 응답</dt><dd>{date(report.lastDelivery)}</dd></div><div><dt>전송 대기 / 재시도 소진</dt><dd>{report.pendingDelivery} / {report.exhaustedDelivery}</dd></div></dl><p className="ga-muted">개발 데이터는 PostHog로 보내지 않습니다. 전송 성공 응답은 수신 완료를 뜻하며 PostHog 처리 지연이 있을 수 있습니다. 사진·파일명·초대 링크·이메일은 전송하지 않습니다.</p></section></div>
      <p className="ga-footnote">보관 중 첫 이벤트: {date(report.firstEvent)} · 조회는 최근 {days}×24시간, 그래프는 UTC 기준입니다. 지표는 수집 이후 데이터만 사용하며 과거 사용량을 추정하지 않습니다. 삭제·공유 취소된 사진과 삭제된 앨범은 현재 활성 앨범 집계에서 제외됩니다. 유료 결제를 도입하기 전에는 매출·유료 전환 지표를 표시하지 않습니다.</p>
    </>}
  </main>;
}
function Funnel({ rows }: { rows: [string, number][] }) { return <ol className="ga-funnel">{rows.map(([label, value], i) => <li key={label}><div><span>{String(i + 1).padStart(2, '0')} · {label}</span><strong>{value} <small>{i ? percent(value, rows[0][1]) : ''}</small></strong></div><div className="ga-track"><span style={{ width: `${rows[0][1] ? value / rows[0][1] * 100 : 0}%` }} /></div></li>)}</ol>; }
