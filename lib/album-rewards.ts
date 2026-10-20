import 'server-only';
import type { Pool, PoolClient } from 'pg';
import { ApiError } from './server';
import { unlockedRewards, validLoadout } from './piece-rewards';
import { parseDecoration, type RewardDecoration } from './reward-decoration';

export async function albumRewards(db: Pool | PoolClient, who: string, folder: string) {
  const album = (await db.query(`SELECT f.owner_id,f.group_id,f.reward_cover
    FROM snaproom.folders f JOIN snaproom.members m ON m.folder_id=f.id AND m.viewer_id=$2
    WHERE f.id=$1 AND f.deleted_at IS NULL`, [folder, who])).rows[0];
  if (!album) throw new ApiError(404, 'FOLDER_NOT_FOUND');
  const space = album.group_id ?? 'personal';
  const total = Number((await db.query(`SELECT COALESCE(sum(pieces),0) AS total
    FROM snaproom.piece_reward_months WHERE viewer_id=$1 AND space_key=$2`, [who, space])).rows[0].total);
  const saved = (await db.query('SELECT equipment FROM snaproom.piece_reward_loadouts WHERE viewer_id=$1 AND space_key=$2', [who, space])).rows[0]?.equipment ?? {};
  return {
    cover: album.reward_cover as RewardDecoration | null,
    canEdit: album.owner_id === who,
    group: album.group_id as string | null,
    unlocked: unlockedRewards(total).map(reward => reward.id),
    equipped: validLoadout(total, saved),
  };
}
export async function allowedAlbumDecoration(db: Pool | PoolClient, who: string, folder: string, input: unknown) {
  const rewards = await albumRewards(db, who, folder);
  try { return parseDecoration(input, rewards.unlocked); }
  catch (error) { throw new ApiError(400, error instanceof Error ? error.message : 'INVALID_DECORATION'); }
}
