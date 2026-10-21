// Exercises the account transaction with synthetic verified identities, not a login bypass.
// Every fixture and mutation is rolled back in one transaction.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync('lib/auth-core.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {attachIdentity}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const env={...parseEnv(readFileSync('.env.local','utf8')),...process.env};
const db=new pg.Client({connectionString:env.DATABASE_URL});
try {
  await db.connect();await db.query('BEGIN');
  const owner=randomUUID(),guest=randomUUID(),other=randomUUID(),folder=randomUUID(),photo=randomUUID();
  const identity={uid:'test-'+randomUUID(),provider:'google.com',email:'same@example.com',name:'Test account'};
  await db.query('INSERT INTO snaproom.viewers(id) SELECT unnest($1::uuid[])',[[owner,guest,other]]);
  await db.query("INSERT INTO snaproom.sessions(token_hash,viewer_id,expires_at) VALUES($1,$2,now()+interval '1 day')",[randomUUID(),owner]);
  assert.equal(await attachIdentity(db,owner,identity),owner);
  const loginAt=async uid=>(await db.query('SELECT last_login_at FROM snaproom.accounts WHERE firebase_uid=$1',[uid])).rows[0].last_login_at;
  assert.ok(await loginAt(identity.uid) instanceof Date, 'First login is recorded');
  await db.query("UPDATE snaproom.accounts SET last_login_at='2000-01-01T00:00:00Z' WHERE firebase_uid=$1",[identity.uid]);
  assert.equal((await db.query('SELECT 1 FROM snaproom.sessions WHERE viewer_id=$1',[owner])).rowCount,0);
  await db.query('INSERT INTO snaproom.folders(id,owner_id,name) VALUES($1,$2,$3)',[folder,guest,'Auth fixture']);
  await db.query('INSERT INTO snaproom.members(folder_id,viewer_id) VALUES($1,$2),($1,$3)',[folder,guest,owner]);
  await db.query("INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,size_bytes,captured_at) VALUES($1,$2,$3,'Fixture',$4,1,now())",[photo,folder,guest,'fixture/'+photo]);
  await db.query("INSERT INTO snaproom.invites(token_hash,folder_id,created_by,expires_at) VALUES($1,$2,$3,now()+interval '1 day')",[randomUUID(),folder,guest]);
  const record=randomUUID(),comment=randomUUID();
  await db.query("INSERT INTO snaproom.records(id,folder_id,owner_id,body,recorded_on) VALUES($1,$2,$3,'Private record','2026-01-02')",[record,folder,guest]);
  await db.query("INSERT INTO snaproom.comments(id,record_id,owner_id,body) VALUES($1,$2,$3,'Private comment')",[comment,record,guest]);
  await db.query('INSERT INTO snaproom.reactions(id,record_id,owner_id) VALUES($1,$2,$3),($4,$2,$5)',[randomUUID(),record,guest,randomUUID(),owner]);
  await db.query("INSERT INTO snaproom.comment_reports(id,comment_id,owner_id,reason) VALUES($1,$2,$3,'Fixture report')",[randomUUID(),comment,guest]);
  for(const table of ['photos','records']) await db.query(`UPDATE snaproom.${table} SET recipients=$1 WHERE folder_id=$2`,[[guest,owner],folder]);
  const group=randomUUID();
  await db.query('INSERT INTO snaproom.groups(id,owner_id,name) VALUES($1,$2,$3)',[group,guest,'Account merge group']);
  await db.query('INSERT INTO snaproom.group_members(group_id,viewer_id) VALUES($1,$2),($1,$3)',[group,guest,owner]);
  await db.query('UPDATE snaproom.folders SET group_id=$2 WHERE id=$1',[folder,group]);
  assert.equal(await attachIdentity(db,guest,identity),owner);
  assert.ok((await loginAt(identity.uid)).getUTCFullYear()>2000, 'Cross-device login updates the existing account');
  assert.equal((await db.query('SELECT owner_id FROM snaproom.groups WHERE id=$1',[group])).rows[0].owner_id,owner);
  assert.equal((await db.query('SELECT viewer_id FROM snaproom.group_members WHERE group_id=$1',[group])).rowCount,1);

  for(const table of ['photos','records']) assert.deepEqual((await db.query(`SELECT recipients FROM snaproom.${table} WHERE folder_id=$1`,[folder])).rows[0].recipients,[owner]);
  assert.equal((await db.query('SELECT owner_id,shared FROM snaproom.records WHERE id=$1',[record])).rows[0].owner_id,owner);
  assert.equal((await db.query('SELECT shared FROM snaproom.records WHERE id=$1',[record])).rows[0].shared,false);
  assert.equal((await db.query('SELECT owner_id FROM snaproom.comments WHERE id=$1',[comment])).rows[0].owner_id,owner);
  assert.equal((await db.query('SELECT owner_id FROM snaproom.reactions WHERE record_id=$1',[record])).rowCount,1);
  assert.equal((await db.query('SELECT owner_id FROM snaproom.comment_reports WHERE comment_id=$1',[comment])).rows[0].owner_id,owner);

  assert.equal((await db.query('SELECT owner_id FROM snaproom.folders WHERE id=$1',[folder])).rows[0].owner_id,owner);
  const stored=(await db.query('SELECT owner_id,shared FROM snaproom.photos WHERE id=$1',[photo])).rows[0];
  assert.equal(stored.owner_id,owner);assert.equal(stored.shared,false);
  assert.equal((await db.query('SELECT 1 FROM snaproom.members WHERE folder_id=$1',[folder])).rowCount,1);
  assert.equal((await db.query('SELECT created_by FROM snaproom.invites WHERE folder_id=$1',[folder])).rows[0].created_by,owner);
  assert.equal((await db.query('SELECT 1 FROM snaproom.viewers WHERE id=$1',[guest])).rowCount,0);
  await db.query('UPDATE snaproom.accounts SET last_login_at=NULL WHERE firebase_uid=$1',[identity.uid]);
  assert.equal(await attachIdentity(db,owner,identity),owner); // Repeated sign-in is stable.
  const repeatedLogin=await loginAt(identity.uid);
  assert.ok(repeatedLogin instanceof Date, 'Existing accounts without login history are recorded on login');
  await db.query('SAVEPOINT failed_session');
  await attachIdentity(db,owner,identity);
  await db.query('ROLLBACK TO SAVEPOINT failed_session');
  assert.deepEqual(await loginAt(identity.uid),repeatedLogin,'Failed session transaction does not retain a login timestamp');
  const unrelated={...identity,uid:'test-'+randomUUID(),provider:'apple.com'};
  assert.equal(await attachIdentity(db,other,unrelated),other); // Same email does not merge accounts.
  await assert.rejects(()=>attachIdentity(db,owner,unrelated),/LOGOUT_FIRST/);
  assert.deepEqual(await loginAt(identity.uid),repeatedLogin,'Rejected account switch does not change last login');
  console.log('PASS: first, repeat and cross-device last login timestamps; rejected login and transaction rollback.');
  console.log('PASS: account upgrade, cross-device merge, private visibility, member deduplication, guest session revocation, stable identity, same-email isolation and switch rejection.');
} finally {await db.query('ROLLBACK').catch(()=>{});await db.end();console.log('Rolled back all account fixtures.');}
