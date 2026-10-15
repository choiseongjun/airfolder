import type { PoolClient } from 'pg';

export type Identity = { uid: string; provider: 'google.com' | 'apple.com' | 'password'; email: string | null; name: string };

// Only call this after Firebase Admin has verified the token's signature, issuer and audience.
export function identityFromVerifiedClaims(token: {
  uid?: string; auth_time?: number; email?: string; email_verified?: boolean; name?: string;
  firebase?: { sign_in_provider?: string };
}, now = Math.floor(Date.now() / 1000), allowProvisionedPassword = false): Identity {
  const provider = token.firebase?.sign_in_provider;
  const password = provider === 'password' && allowProvisionedPassword;
  if ((provider !== 'google.com' && provider !== 'apple.com' && !password) || !token.uid || token.uid.length > 128 ||
    !Number.isFinite(token.auth_time) || token.auth_time! > now + 60 || now - token.auth_time! > 300 ||
    (token.email !== undefined && ((!password && token.email_verified !== true) || token.email.length > 254))) throw new Error('INVALID_IDENTITY');
  return { uid: token.uid, provider: provider as Identity['provider'], email: token.email_verified ? token.email || null : null, name: token.name?.trim().slice(0,80) || (password ? 'Invited member' : provider === 'apple.com' ? 'Apple user' : 'Google user') };
}

// The caller owns the transaction. Never identify or merge an account by email.
export async function attachIdentity(db: PoolClient, guest: string, identity: Identity) {
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['snaproom-auth:' + identity.uid]);
  const locked = await db.query('SELECT id FROM snaproom.viewers WHERE id=$1 FOR UPDATE', [guest]);
  if (!locked.rowCount) throw new Error('SESSION_CHANGED');
  const current = await db.query('SELECT firebase_uid FROM snaproom.accounts WHERE viewer_id=$1', [guest]);
  if (current.rowCount && current.rows[0].firebase_uid !== identity.uid) throw new Error('LOGOUT_FIRST');
  const existing = await db.query('SELECT viewer_id FROM snaproom.accounts WHERE firebase_uid=$1', [identity.uid]);
  if (!existing.rowCount) {
    await db.query('INSERT INTO snaproom.accounts(firebase_uid,viewer_id,provider,email,display_name) VALUES($1,$2,$3,$4,$5)', [identity.uid,guest,identity.provider,identity.email,identity.name]);
    // Guest cookies must not become permanent credentials for the upgraded account.
    await db.query('DELETE FROM snaproom.sessions WHERE viewer_id=$1', [guest]);
    return guest;
  }
  const owner = existing.rows[0].viewer_id as string;
  if (owner !== guest) {
    await db.query('UPDATE snaproom.groups SET owner_id=$1 WHERE owner_id=$2',[owner,guest]);
    await db.query('INSERT INTO snaproom.group_members(group_id,viewer_id,muted) SELECT group_id,$1,muted FROM snaproom.group_members WHERE viewer_id=$2 ON CONFLICT DO NOTHING',[owner,guest]);
    await db.query('INSERT INTO snaproom.notifications(viewer_id,folder_id,photo_id,record_id,actor_id,kind,event_key,created_at,read_at,pushed_at) SELECT $1,folder_id,photo_id,record_id,actor_id,kind,event_key,created_at,read_at,pushed_at FROM snaproom.notifications WHERE viewer_id=$2 ON CONFLICT DO NOTHING',[owner,guest]);
    await db.query('UPDATE snaproom.notifications SET actor_id=$1 WHERE actor_id=$2',[owner,guest]);
    await db.query('UPDATE snaproom.folders SET owner_id=$1 WHERE owner_id=$2', [owner,guest]);
    await db.query('UPDATE snaproom.photos SET owner_id=$1 WHERE owner_id=$2', [owner,guest]);
    await db.query('UPDATE snaproom.invites SET created_by=$1 WHERE created_by=$2', [owner,guest]);
    await db.query('INSERT INTO snaproom.members(folder_id,viewer_id) SELECT folder_id,$1 FROM snaproom.members WHERE viewer_id=$2 ON CONFLICT DO NOTHING', [owner,guest]);
    await db.query('UPDATE snaproom.records SET owner_id=$1 WHERE owner_id=$2', [owner,guest]);
    await db.query('UPDATE snaproom.comments SET owner_id=$1 WHERE owner_id=$2', [owner,guest]);
    await db.query('INSERT INTO snaproom.reactions(id,photo_id,record_id,owner_id) SELECT gen_random_uuid(),photo_id,record_id,$1 FROM snaproom.reactions WHERE owner_id=$2 ON CONFLICT DO NOTHING',[owner,guest]);
    await db.query('INSERT INTO snaproom.comment_reports(id,comment_id,owner_id,reason,status) SELECT gen_random_uuid(),comment_id,$1,reason,status FROM snaproom.comment_reports WHERE owner_id=$2 ON CONFLICT DO NOTHING',[owner,guest]);
    for(const table of ['photos','records']) await db.query(`UPDATE snaproom.${table} SET recipients=ARRAY(SELECT DISTINCT unnest(array_replace(recipients,$2::uuid,$1::uuid))) WHERE $2::uuid=ANY(recipients)`,[owner,guest]);
    await db.query('DELETE FROM snaproom.viewers WHERE id=$1', [guest]);
  }
  return owner;
}
