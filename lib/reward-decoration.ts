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
  { id: 'croissant', emoji: '🥐', name: '소금빵' }, { id: 'coffee', emoji: '☕', name: '카페' },
  { id: 'alarm', emoji: '🚨', name: '긴급' }, { id: 'money', emoji: '💸', name: '정산' },
  { id: 'sunglasses', emoji: '🕶️', name: '쿨' }, { id: 'crown', emoji: '👑', name: '오늘의 주인공' },
  { id: 'heart', emoji: '💖', name: '하트' }, { id: 'sparkles', emoji: '✨', name: '반짝이' },
  { id: 'flower', emoji: '🌼', name: '꽃' }, { id: 'camera', emoji: '📸', name: '찰칵' },
  { id: 'laugh', emoji: '🤣', name: '웃음' }, { id: 'fire', emoji: '🔥', name: '불꽃' },
] as const;
export type StudioSticker = { id: string; sticker: typeof STUDIO_STICKERS[number]['id']; x: number; y: number; size: number; rotation: number };
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
    return { id: value.id, sticker: value.sticker as StudioSticker['sticker'], x: value.x as number, y: value.y as number, size: value.size as number, rotation: value.rotation as number };
  });
  if (!character && !stickers?.length) return null;
  return { ...(character ? { character } : {}), ...(outfit ? { outfit } : {}), ...(input.phrase ? { phrase: input.phrase as RewardPhrase } : {}), ...(stickers?.length ? { stickers } : {}) };
}
