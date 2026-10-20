import { ApiError, json, safe, sameOrigin, transaction, uuid, viewer } from '@/lib/server';
import { REWARDS, rewardState, type RewardLoadout, type RewardMonth } from '@/lib/piece-rewards';

// Sync the collection when it is opened; no client-supplied counts or unlocks.
// Korea time is fixed for the reward ledger so changing a device timezone cannot
// move the same upload into two reward months.
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request);
    const who = await viewer(), body = await json(request);
    const group = body.group == null ? null : uuid(body.group);
    if (body.action !== 'sync' && body.action !== 'equip') throw new ApiError(400, 'INVALID_ACTION');
    return transaction(async db => {
      if (group && !(await db.query('SELECT 1 FROM snaproom.group_members WHERE group_id=$1 AND viewer_id=$2', [group, who])).rowCount) {
        throw new ApiError(404, 'GROUP_NOT_FOUND');
      }
      const space = group ?? 'personal';
      // Serialise sync/equip for this owner and space, including empty loadouts.
      await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`piece-rewards:${who}:${space}`]);
      await db.query(`INSERT INTO snaproom.piece_reward_months(viewer_id,space_key,month,pieces)
        SELECT $1,$3,date_trunc('month',p.created_at AT TIME ZONE 'Asia/Seoul')::date,count(*)::int
        FROM snaproom.photos p JOIN snaproom.folders f ON f.id=p.folder_id
        JOIN snaproom.members m ON m.folder_id=f.id AND m.viewer_id=$1
        WHERE f.deleted_at IS NULL AND p.deleted_at IS NULL AND p.created_at<=now()
          AND (($2::uuid IS NULL AND f.group_id IS NULL) OR f.group_id=$2)
          AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$1)
        GROUP BY date_trunc('month',p.created_at AT TIME ZONE 'Asia/Seoul')::date
        ON CONFLICT(viewer_id,space_key,month) DO UPDATE
          SET pieces=greatest(snaproom.piece_reward_months.pieces,excluded.pieces)`, [who, group, space]);
      const rows = (await db.query(`SELECT to_char(month,'YYYY-MM') AS month,pieces
        FROM snaproom.piece_reward_months WHERE viewer_id=$1 AND space_key=$2 ORDER BY month DESC`, [who, space])).rows as RewardMonth[];
      const current = (await db.query("SELECT to_char(now() AT TIME ZONE 'Asia/Seoul','YYYY-MM') AS month")).rows[0].month as string;
      const saved = (await db.query('SELECT equipment FROM snaproom.piece_reward_loadouts WHERE viewer_id=$1 AND space_key=$2', [who, space])).rows[0]?.equipment ?? {};
      const state = rewardState(rows, current, saved as RewardLoadout);
      if (body.action === 'equip') {
        const reward = REWARDS.find(item => item.id === body.reward);
        if (!reward || !state.unlocked.includes(reward.id)) throw new ApiError(400, 'REWARD_LOCKED');
        state.equipped[reward.kind] = reward.id;
        await db.query(`INSERT INTO snaproom.piece_reward_loadouts(viewer_id,space_key,equipment) VALUES($1,$2,$3)
          ON CONFLICT(viewer_id,space_key) DO UPDATE SET equipment=excluded.equipment`, [who, space, JSON.stringify(state.equipped)]);
      }
      return Response.json(state, { headers: { 'Cache-Control': 'private, no-store' } });
    });
  });
}
