export type RewardKind = 'character' | 'outfit' | 'badge' | 'card';
export type Reward = { id: string; kind: RewardKind; name: string; description: string; pieces: number; color: string };
export const REWARD_KINDS: Record<RewardKind, string> = { character: '친구들', outfit: '옷장', badge: '배지', card: '카드' };
export const REWARDS: Reward[] = [
  { id: 'bear', kind: 'character', name: '기록곰 모모', description: '작은 순간도 꼭 안아주는 친구', pieces: 5, color: '#c69b75' },
  { id: 'rabbit', kind: 'character', name: '소풍토끼 토리', description: '다음 추억을 향해 폴짝', pieces: 30, color: '#edc3bd' },
  { id: 'cat', kind: 'character', name: '필름냥 코코', description: '햇살 좋은 사진을 골라요', pieces: 60, color: '#ddba76' },
  { id: 'dog', kind: 'character', name: '산책강아지 두두', description: '함께 걷는 길이 제일 좋아', pieces: 100, color: '#b18a70' },
  { id: 'fox', kind: 'character', name: '여행여우 루루', description: '골목마다 이야기를 발견해요', pieces: 160, color: '#d78d63' },
  { id: 'panda', kind: 'character', name: '느긋판다 보보', description: '우리 속도로 천천히 오래오래', pieces: 250, color: '#ddd8c9' },
  { id: 'leaf', kind: 'outfit', name: '새싹 머리핀', description: '첫 추억과 함께 돋은 새싹', pieces: 10, color: '#c9dac1' },
  { id: 'scarf', kind: 'outfit', name: '포근 체크 목도리', description: '사진 속 온기를 둘러요', pieces: 20, color: '#dba298' },
  { id: 'beret', kind: 'outfit', name: '산책 베레모', description: '오늘은 조금 특별한 산책', pieces: 40, color: '#c4c7aa' },
  { id: 'camera', kind: 'outfit', name: '작은 필름 카메라', description: '놓치고 싶지 않은 순간들', pieces: 75, color: '#b6c9cf' },
  { id: 'bag', kind: 'outfit', name: '소풍 가방', description: '추억을 한가득 담아 와요', pieces: 120, color: '#dcb976' },
  { id: 'crown', kind: 'outfit', name: '별빛 왕관', description: '오래 모아온 마음에 반짝임을', pieces: 200, color: '#ead48e' },
  { id: 'first', kind: 'badge', name: '첫 페이지', description: '우리 이야기의 첫 조각', pieces: 1, color: '#d8c4aa' },
  { id: 'collector', kind: 'badge', name: '순간 수집가', description: '스물다섯 순간을 모았어요', pieces: 25, color: '#e2b99b' },
  { id: 'keeper', kind: 'badge', name: '추억 지킴이', description: '쉰 개의 순간을 간직해요', pieces: 50, color: '#b9c9ac' },
  { id: 'story', kind: 'badge', name: '이야기꾼', description: '백 개의 조각이 이야기가 돼요', pieces: 100, color: '#b6c5d3' },
  { id: 'archive', kind: 'badge', name: '작은 기록가', description: '이백 개의 순간이 쌓인 서재', pieces: 200, color: '#cbbbd1' },
  { id: 'forever', kind: 'badge', name: '오래오래 함께', description: '오백 조각만큼 단단해진 기억', pieces: 500, color: '#e0c579' },
  { id: 'cream', kind: 'card', name: '크림 엽서', description: '따뜻한 종이에 담은 이달의 기록', pieces: 25, color: '#f1e4cd' },
  { id: 'sage', kind: 'card', name: '초록 소풍', description: '싱그러운 작은 피크닉', pieces: 50, color: '#d9e4ce' },
  { id: 'peach', kind: 'card', name: '복숭아 편지', description: '다정한 마음을 담은 편지', pieces: 80, color: '#f0d5ca' },
  { id: 'blue', kind: 'card', name: '바다 우편', description: '푸른 날의 기억을 보내요', pieces: 130, color: '#d1e1e8' },
  { id: 'lavender', kind: 'card', name: '보랏빛 저녁', description: '하루 끝에 꺼내 보는 추억', pieces: 180, color: '#e0d7e8' },
  { id: 'gold', kind: 'card', name: '별빛 소장본', description: '차곡차곡 쌓인 순간들의 특별판', pieces: 300, color: '#eee0b5' },
];
export type RewardLoadout = Partial<Record<RewardKind, string>>;
export type RewardMonth = { month: string; pieces: number };
export type RewardState = { months: RewardMonth[]; total: number; month: string; unlocked: string[]; equipped: RewardLoadout };
export function unlockedRewards(total: number) {
  return REWARDS.filter(reward => reward.pieces <= total);
}
export function validLoadout(total: number, requested: RewardLoadout): RewardLoadout {
  const available = unlockedRewards(total);
  return Object.fromEntries((Object.keys(REWARD_KINDS) as RewardKind[]).map(kind => {
    const own = available.filter(reward => reward.kind === kind);
    return [kind, own.find(reward => reward.id === requested[kind])?.id ?? own[0]?.id];
  }).filter(([, id]) => id));
}
export function rewardState(months: RewardMonth[], month: string, requested: RewardLoadout): RewardState {
  const total = months.reduce((sum, row) => sum + row.pieces, 0);
  return { months, total, month, unlocked: unlockedRewards(total).map(reward => reward.id), equipped: validLoadout(total, requested) };
}
export function growthStage(total: number) {
  if (total >= 100) return { label: '든든한 추억 친구', level: 4 };
  if (total >= 25) return { label: '함께 걷는 친구', level: 3 };
  if (total >= 5) return { label: '처음 만난 친구', level: 2 };
  return { label: '만남을 기다리는 알', level: 1 };
}
