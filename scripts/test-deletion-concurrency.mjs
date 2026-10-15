// Two real DB connections, disposable rows, and fake identity/storage dependencies.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { deleteRequestedAccount } from './account-deletion-core.mjs';

const env = { ...parseEnv(readFileSync('.env.local', 'utf8')), ...process.env };
const db = new pg.Client({ connectionString: env.DATABASE_URL });
const other = new pg.Client({ connectionString: env.DATABASE_URL });
const viewerId = randomUUID(), uid = 'deletion-lock-fixture-' + randomUUID();
const lockSql = "SELECT pg_try_advisory_xact_lock(hashtext('snaproom-deletion-worker-v2')) AS locked";
const store = { remove: async () => { throw new Error('Fixture has no storage files'); } };
let authCalls = 0;
try {
  await db.connect(); await other.connect();
  await db.query("INSERT INTO snaproom.viewers(id,deletion_requested_at) VALUES($1,now()-interval '10 minutes')", [viewerId]);
  await db.query("INSERT INTO snaproom.accounts(firebase_uid,viewer_id,provider,display_name) VALUES($1,$2,'google.com','Disposable lock fixture')", [uid, viewerId]);
  await other.query('BEGIN');
  assert.equal((await other.query(lockSql)).rows[0].locked, true);
  assert.equal(await deleteRequestedAccount(db, store, null, viewerId), false);
  assert.equal((await db.query('SELECT deletion_attempts FROM snaproom.viewers WHERE id=$1', [viewerId])).rows[0].deletion_attempts, 0);
  await other.query('ROLLBACK');
  await assert.rejects(deleteRequestedAccount(db, store, null, viewerId), error => error.code === 'FIREBASE_ADMIN_NOT_CONFIGURED');
  // A failed worker must release its lock and commit its failure audit.
  await other.query('BEGIN');
  assert.equal((await other.query(lockSql)).rows[0].locked, true);
  await other.query('COMMIT');
  assert.equal((await db.query("SELECT 1 FROM snaproom.admin_audit WHERE subject_id=$1 AND action='deletion_failed'", [viewerId])).rowCount, 1);
  assert.equal(await deleteRequestedAccount(db, store, { deleteUser: async value => { assert.equal(value, uid); authCalls++; } }, viewerId), true);
  assert.equal(authCalls, 1);
  // Successful completion also releases the lock for the next scheduled invocation.
  await other.query('BEGIN');
  assert.equal((await other.query(lockSql)).rows[0].locked, true);
  await other.query('COMMIT');
  const actions = (await db.query('SELECT action FROM snaproom.admin_audit WHERE subject_id=$1 ORDER BY created_at,id', [viewerId])).rows.map(row => row.action);
  assert.deepEqual(actions, ['deletion_started','deletion_failed','deletion_retried','deletion_completed']);
  assert.equal(await deleteRequestedAccount(db, store, null, viewerId), false);
  console.log('PASS: concurrent worker exclusion, automatic lock release after failure/success, retry and ordered audit records. No real storage or Firebase identity modified.');
} finally {
  await other.query('ROLLBACK').catch(() => {});
  await db.query('ROLLBACK').catch(() => {});
  await db.query('DELETE FROM snaproom.accounts WHERE firebase_uid=$1 AND viewer_id=$2', [uid, viewerId]);
  await db.query('DELETE FROM snaproom.viewers WHERE id=$1', [viewerId]);
  await db.query('DELETE FROM snaproom.admin_audit WHERE subject_id=$1', [viewerId]);
  await Promise.all([db.end(), other.end()]);
}
