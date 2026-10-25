import type { GrowthReport } from '@/lib/growth-report';

export default function MakerReport({ report }: { report: GrowthReport }) {
  const labels = ['유입 / 캠페인', '앨범', '제작 화면', '사진 고르기 클릭', '사진 선택 완료', '내 사진 미리보기', '저장 시도', '저장 완료', '사진 오류', '저장 오류'];
  const reasonNames: Record<string, string> = { network: '네트워크', size: '사진 크기', storage: '저장 공간', format: '사진 형식', permission: '접근·동의', other: '기타' };
  return <><section className="ga-panel"><h2>사진 요청 → 친구가 사진 보내기</h2>
    <p className="ga-muted">여행 사진 받기 화면에서 시작한 시도를 캠페인별로 연결합니다. 링크 생성은 서버 기록, 복사·공유 창 열기는 브라우저 기록입니다. 복사하거나 공유 창을 열었다고 실제 발송된 것은 아닙니다.</p>
    <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left',borderSpacing:12}}><thead><tr>{['유입 / 캠페인','요청 화면','링크 만들기 클릭','링크 생성','메시지 복사','공유 창 열기','친구가 열어본 앨범','친구가 사진 보탠 앨범'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{report.photoRequests?.map(row=><tr key={`${row.source}:${row.campaign}`}><td>{row.source} / {row.campaign}</td><td>{row.viewed}</td><td>{row.started}</td><td>{row.ready}</td><td>{row.copied}</td><td>{row.sharing}</td><td>{row.opened}</td><td>{row.contributed}</td></tr>)}</tbody></table></div>
    {!report.photoRequests?.length&&<p>배포 이후 사진 요청 화면을 연 기록부터 표시됩니다.</p>}
    <p className="ga-muted">각 단계는 시도별 한 번만 셉니다. 생성 후 7일 내 같은 앨범에서 주인과 다른 식별자가 열거나 전체 멤버 공유 사진을 저장했을 때 친구 참여로 집계합니다. 나만 보기 사진과 주인의 확인·업로드는 제외합니다. 실제 사람 수를 보장하지 않으며 내부 검증은 utm_source=qa로 분리합니다.</p>
  </section><section className="ga-panel"><h2>방문 → 내 사진으로 앨범 완성</h2>
    <p>방문 <strong>{report.visits.sessions}회</strong> · 방문한 브라우저·계정 식별자 <strong>{report.visits.browsers}개</strong></p>
    <p className="ga-muted">30분간 활동이 없거나 다른 캠페인 링크로 들어오면 새 방문입니다. 실제 사람 수와 같지 않으며 내부 접속도 포함될 수 있습니다. utm_source=qa인 검증 접속은 개발·검증 데이터로 분리합니다. 새 방문 측정 시작: {report.visits.since ? new Date(report.visits.since).toLocaleString('ko-KR') : '아직 없음'}.</p>
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'left', borderSpacing: 12 }}><thead><tr>{labels.map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{report.maker.map(row => <tr key={`${row.source}:${row.campaign}:${row.template}`}>
      <td>{row.source} / {row.campaign}</td><td>{row.template}</td><td>{row.viewed}</td><td>{row.picked}</td><td>{row.selected}</td><td>{row.previewed}</td><td>{row.saving}</td><td>{row.saved}</td><td>{row.photoFailed}</td><td>{row.failed}</td>
    </tr>)}</tbody></table></div>
    {!report.maker.length && <p>배포 이후 제작 화면을 연 기록부터 표시됩니다. 과거 기록을 추정하지 않습니다.</p>}
    <p className="ga-muted">한 번 연 제작 화면에서 각 단계에 도달했는지를 중복 제거하여 셉니다. 새로 열거나 새로고침하면 별도 제작 시도입니다. 샘플 사진은 미리보기 완료에 포함하지 않으며, 저장 완료는 서버에 실제 사진과 기록이 저장된 경우만 집계합니다. 첫 화면을 연 뒤 7일 안의 행동을 연결합니다. 오류 후 재시도에 성공하면 오류와 완료에 모두 포함됩니다. 개인정보 보호 설정이나 통신 문제로 일부 단계가 누락될 수 있습니다.</p>
    {!!report.makerFailures.length && <ul className="ga-failures">{report.makerFailures.map(row => <li key={`${row.event}:${row.reason}`}><span>{row.event === 'album_photo_failed' ? '사진 선택·미리보기' : '저장'} · {reasonNames[row.reason] || '기타'}</span><strong>{row.count}건</strong></li>)}</ul>}
  </section></>;
}
