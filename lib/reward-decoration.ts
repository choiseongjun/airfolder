import { REWARDS } from './piece-rewards';

export const REWARD_PHRASES = {
  thanks: { ko: '고마워!', en: 'Thank you!' },
  again: { ko: '또 놀자!', en: 'See you again!' },
  best: { ko: '최고였어!', en: 'Best day ever!' },
  love: { ko: '소중한 우리', en: 'Our precious moments' },
  smile: { ko: '웃는 날만 가득', en: 'More happy days' },
  remember: { ko: '이 순간 기억해', en: 'Remember this moment' },
} as const;
export type RewardPhrase = keyof typeof REWARD_PHRASES;
export const STUDIO_STICKERS = [
  { id: 'croissant', emoji: '🥐', name: '소금빵', kind: 'sticker' }, { id: 'coffee', emoji: '☕', name: '카페', kind: 'sticker' },
  { id: 'alarm', emoji: '🚨', name: '긴급', kind: 'sticker' }, { id: 'money', emoji: '💸', name: '정산', kind: 'sticker' },
  { id: 'sunglasses', emoji: '🕶️', name: '쿨', kind: 'sticker' }, { id: 'crown', emoji: '👑', name: '오늘의 주인공', kind: 'sticker' },
  { id: 'heart', emoji: '💖', name: '하트', kind: 'emoji' }, { id: 'sparkles', emoji: '✨', name: '반짝이', kind: 'emoji' },
  { id: 'flower', emoji: '🌼', name: '꽃', kind: 'emoji' }, { id: 'camera', emoji: '📸', name: '찰칵', kind: 'emoji' },
  { id: 'laugh', emoji: '🤣', name: '웃음', kind: 'emoji' }, { id: 'fire', emoji: '🔥', name: '불꽃', kind: 'emoji' },
  { id: 'clap', emoji: '👏', name: '박수', kind: 'soundcon' }, { id: 'cheer', emoji: '🎉', name: '축하', kind: 'soundcon' },
  { id: 'wow', emoji: '😲', name: '깜짝', kind: 'soundcon' }, { id: 'cry', emoji: '😭', name: '감동', kind: 'soundcon' },
  { id: 'love', emoji: '🫶', name: '최고야', kind: 'soundcon' }, { id: 'rofl', emoji: '🤣', name: '빵터짐', kind: 'soundcon' },
  { id: 'bubble-wow', emoji: '💬', name: '말풍선 깜짝', kind: 'sticker' }, { id: 'bubble-cute', emoji: '🗯️', name: '말풍선 한마디', kind: 'sticker' },
  { id: 'bubble-note', emoji: '💭', name: '생각 말풍선', kind: 'sticker' },
] as const;
export const STUDIO_STICKER_COPY: Record<string, { category: 'jokes' | 'cafe' | 'roast'; title: string; caption: string }> = {
  alarm: { category: 'jokes', title: '흑역사 박제', caption: '서연 얼굴 조준' }, croissant: { category: 'cafe', title: '소금빵 10개 순삭', caption: '민우 지갑 출혈' }, money: { category: 'jokes', title: '엔빵 요청 출동', caption: '계좌 송금 촉구' },
  sunglasses: { category: 'roast', title: '안 본 눈 삽니다', caption: '자체 모자이크' }, laugh: { category: 'roast', title: 'ㅋㅋㅋㅋ', caption: '배 찢어짐 주의 · 32연타 발동' }, crown: { category: 'jokes', title: '오늘의 엽사 MVP', caption: '만장일치 선정' },
  coffee: { category: 'cafe', title: '카페인 충전 완료', caption: '오늘도 수다 무한리필' }, heart: { category: 'cafe', title: '우리 우정 영원해', caption: '이 순간 저장' }, sparkles: { category: 'cafe', title: '오늘 분위기 미쳤다', caption: '반짝반짝 기억하기' },
  flower: { category: 'cafe', title: '꽃보다 우리', caption: '사진 잘 나왔다!' }, camera: { category: 'jokes', title: '증거 사진 확보', caption: '삭제 금지' }, fire: { category: 'jokes', title: '오늘 텐션 최고', caption: '다음 모임 예약' },
  clap: { category: 'roast', title: '박수 부탁드립니다', caption: '오늘의 주인공 등장' }, cheer: { category: 'jokes', title: '축하할 일 추가요', caption: '단톡방 소집 완료' }, wow: { category: 'roast', title: '이게 진짜라고?', caption: '놀란 표정 저장' },
  cry: { category: 'roast', title: '감동 실화냐', caption: '눈물 버튼 눌림' }, love: { category: 'cafe', title: '너희가 최고야', caption: '애정 듬뿍 담아' }, rofl: { category: 'roast', title: '웃음 참기 실패', caption: '단톡방 레전드 갱신' },
  'bubble-wow': { category: 'jokes', title: '이게 실화야?', caption: '지금 표정 봤어?' }, 'bubble-cute': { category: 'cafe', title: '오늘 너무 좋다', caption: '우리 또 오자 ♡' }, 'bubble-note': { category: 'roast', title: '속마음: 집 가고 싶다', caption: '근데 디저트는 먹고 감' },
};
export type StudioSticker = { id: string; sticker: typeof STUDIO_STICKERS[number]['id']; kind: typeof STUDIO_STICKERS[number]['kind']; x: number; y: number; size: number; rotation: number };
export type RewardDecoration = { character?: string; outfit?: string; phrase?: RewardPhrase; stickers?: StudioSticker[] };
export type AlbumRewardData = {
  cover: RewardDecoration | null;
  canEdit: boolean;
  unlocked: string[];
  equipped: { character?: string; outfit?: string };
  group: string | null;
};
export function parseDecoration(value: unknown, unlocked?: string[]): RewardDecoration | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_DECORATION');
  const input = value as Record<string, unknown>;
  function check(id: unknown, kind: 'character' | 'outfit') {
    if (typeof id !== 'string' || !REWARDS.some(reward => reward.kind === kind && reward.id === id)) throw new Error('INVALID_DECORATION');
    if (unlocked && !unlocked.includes(id)) throw new Error('REWARD_LOCKED');
    return id;
  }
  const character = input.character == null || input.character === '' ? undefined : check(input.character, 'character');
  const outfit = input.outfit == null || input.outfit === '' ? undefined : check(input.outfit, 'outfit');
  if (outfit && !character) throw new Error('INVALID_DECORATION');
  if (input.phrase !== undefined && (typeof input.phrase !== 'string' || !Object.hasOwn(REWARD_PHRASES, input.phrase))) throw new Error('INVALID_DECORATION');
  const validIds = STUDIO_STICKERS.map(sticker => sticker.id);
  if (input.stickers !== undefined && (!Array.isArray(input.stickers) || input.stickers.length > 12)) throw new Error('INVALID_DECORATION');
  const stickers = (input.stickers as unknown[] | undefined)?.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('INVALID_DECORATION');
    const value = item as Record<string, unknown>;
    if (typeof value.id !== 'string' || !/^[a-z\d-]{1,48}$/i.test(value.id) || typeof value.sticker !== 'string' || !validIds.includes(value.sticker as typeof validIds[number])) throw new Error('INVALID_DECORATION');
    for (const key of ['x', 'y', 'size', 'rotation'] as const) if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) throw new Error('INVALID_DECORATION');
    if ((value.x as number) < 0 || (value.x as number) > 100 || (value.y as number) < 0 || (value.y as number) > 100 || (value.size as number) < 24 || (value.size as number) > 96 || (value.rotation as number) < -45 || (value.rotation as number) > 45) throw new Error('INVALID_DECORATION');
    const stickerMeta = STUDIO_STICKERS.find(sticker => sticker.id === value.sticker);
    if (value.kind !== undefined && value.kind !== 'sticker' && value.kind !== 'emoji' && value.kind !== 'soundcon') throw new Error('INVALID_DECORATION');
    return { id: value.id, sticker: value.sticker as StudioSticker['sticker'], kind: (value.kind ?? stickerMeta?.kind ?? 'sticker') as StudioSticker['kind'], x: value.x as number, y: value.y as number, size: value.size as number, rotation: value.rotation as number };
  });
  if (!character && !stickers?.length) return null;
  return { ...(character ? { character } : {}), ...(outfit ? { outfit } : {}), ...(input.phrase ? { phrase: input.phrase as RewardPhrase } : {}), ...(stickers?.length ? { stickers } : {}) };
}
