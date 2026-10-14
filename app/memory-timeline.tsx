/* eslint-disable @next/next/no-img-element */
import "./memory-timeline.css";
export default function MemoryTimeline({ locale }: { locale: "ko" | "en" }) {
  const ko = locale === "ko";
  const events = [
    { date: "2026-03", month: ko ? "3월" : "MAR", name: ko ? "우리의 제주 여행" : "Our island getaway", detail: ko ? "네 사람이 담은 봄날" : "Spring, through four different lenses", image: "photo-1519046904884-53103b34b206" },
    { date: "2026-06", month: ko ? "6월" : "JUN", name: ko ? "다 같이 모인 생일" : "A birthday together", detail: ko ? "평범해서 더 좋은 하루" : "An ordinary day worth remembering", image: "photo-1511632765486-a01980e01a18" },
    { date: "2026-10", month: ko ? "10월" : "OCT", name: ko ? "가을의 작은 여행" : "A little autumn escape", detail: ko ? "우리의 다음 이야기도 여기에" : "Another chapter in our collection", image: "photo-1476514525535-07fb3b4ae5f1" },
  ];
  return <section className="memory-timeline" aria-label={ko ? "공동 기록 타임라인 예시" : "Example shared memory timeline"}>
    <div className="memory-heading"><div><span>OUR LITTLE HISTORY</span><h3>{ko ? "우리, 함께한 날들" : "Our days together"}</h3></div><span className="memory-example">{ko ? "기록 예시" : "Example"}</span></div>
    <div className="memory-year">2026 <span>{ko ? "각자의 시선으로 쌓인 순간들" : "Moments from every perspective"}</span></div>
    <ol>{events.map(event => <li key={event.date}><time dateTime={event.date}>{event.month}</time><div className="memory-event"><img src={`https://images.unsplash.com/${event.image}?auto=format&fit=crop&w=240&q=80`} alt=""/><div><strong>{event.name}</strong><p>{event.detail}</p></div></div></li>)}</ol>
    <p className="memory-next"><span>＋</span>{ko ? "다음에 함께할 날도, 이곳에." : "Room for our next day together."}</p>
  </section>;
}
