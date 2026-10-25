type Health = { percent: number; remaining: number; level: string };
export default function StorageHealth({ health }: { health?: Health }) {
  if (!health) return null;
  return <div className={`admin-notice ${health.level === 'normal' ? '' : 'warning'}`} role="status">
    <strong>서비스 저장 공간 {health.percent}% 사용 · 남은 공간 {(health.remaining / 1024 ** 3).toFixed(2)} GiB</strong>
    <span>{health.level === 'full' ? '전체 저장 한도에 도달해 새 업로드가 제한됩니다. 보관 정책과 저장 예산을 확인해 주세요.' : health.level === 'critical' ? '85% 이상 사용 중입니다. 업로드가 중단되기 전에 저장 예산 확장 또는 삭제 대기 파일 정리를 확인해 주세요.' : health.level === 'warning' ? '70% 이상 사용 중입니다. 저장소 확장 계획을 확인해 주세요.' : '원본·미리보기·처리 예약분·삭제 대기 파일을 포함합니다. 70%·85%에서 경고합니다.'}</span>
  </div>;
}
