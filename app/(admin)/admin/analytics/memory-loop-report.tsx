import type {MemoryLoopReport as Report} from '@/lib/memory-loop-report';
export default function MemoryLoopReport({data}:{data?:Report}){
 if(!data)return null;
 return <section className="ga-panel"><h2>메모 참여 → 보관 → 재방문</h2><div className="ga-cards">{[['남긴 메모',data.notes],['메모 작성자',data.noteWriters],['내보낸 사람',data.exports],['알림에서 방문',data.notificationVisitors],['웹 알림 켠 사람',data.pushEnabled],['인화·포토북 관심',data.printInterest]].map(([label,value])=><article className="ga-stat" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div><p>메모 작성 후 1~7일 재방문: {data.returningWriters} / {data.eligibleWriters}명 {data.eligibleWriters?`(${Math.round(data.returningWriters/data.eligibleWriters*100)}%)`:'· 아직 관찰 기간 부족'}</p><p className="ga-muted">메모는 서버 저장 성공 기준, 나머지는 브라우저 이벤트 기준입니다. 재방문은 첫 메모 후 7일이 지난 작성자만 분모에 포함합니다. 내보내기는 파일 다운로드 요청 완료이며 디스크 저장을 확인하지 않습니다. 관심 표시는 구매나 결제가 아닙니다. 개인정보 보호 설정에 따라 일부 행동은 집계되지 않습니다.</p></section>;
}
