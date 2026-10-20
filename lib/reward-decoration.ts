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
export type RewardDecoration = { character: string; outfit?: string; phrase?: RewardPhrase };
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
  const character = check(input.character, 'character');
  const outfit = input.outfit == null || input.outfit === '' ? undefined : check(input.outfit, 'outfit');
  if (input.phrase !== undefined && (typeof input.phrase !== 'string' || !Object.hasOwn(REWARD_PHRASES, input.phrase))) throw new Error('INVALID_DECORATION');
  return { character, ...(outfit ? { outfit } : {}), ...(input.phrase ? { phrase: input.phrase as RewardPhrase } : {}) };
}
