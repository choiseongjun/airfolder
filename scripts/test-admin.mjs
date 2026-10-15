// Rollback-only integration: real SQL/routes, synthetic users, fake external storage/Firebase.
import assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';
import ts from 'typescript';
import * as passwords from './admin-password.mjs';
import { deleteRequestedAccount } from './account-deletion-core.mjs';

const env = { ...parseEnv(readFileSync('.env.local', 'utf8')), ...process.env };
const db = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const cookieValues = new Map(), cookieOptions = [], removed = [], deletedAuth = [];
const runtimeEnv = { FIREBASE_PROJECT_ID: 'test-project', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project', SUPABASE_URL: 'https://test.invalid', SUPABASE_SECRET_KEY: 'synthetic' };
let storageFailure = false;
class ApiError extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }
const query = (sql, params) => db.query(sql, params);
const deletionDb = { query: (sql, params) => query(sql === 'BEGIN' ? 'SAVEPOINT deletion_fixture' : sql === 'COMMIT' ? 'RELEASE SAVEPOINT deletion_fixture' : sql === 'ROLLBACK' ? 'ROLLBACK TO SAVEPOINT deletion_fixture' : sql, params), release() {} };
const transaction = async fn => { await query('SAVEPOINT admin_route'); try { const r = await fn(db); await query('RELEASE SAVEPOINT admin_route'); return r; } catch (e) { await query('ROLLBACK TO SAVEPOINT admin_route'); await query('RELEASE SAVEPOINT admin_route'); throw e; } };
const hash = v => crypto.createHash('sha256').update(v).digest('hex');
const server = { ApiError, hash, json: r => r.json(), pool: () => ({ query, connect: async () => deletionDb }), transaction, uuid: value => { if (typeof value !== 'string' || !/^[a-f0-9-]{36}$/i.test(value)) throw new ApiError(400, 'INVALID_ID'); return value; }, safe: async fn => { try { return await fn(); } catch (error) { if (error instanceof ApiError) return Response.json({ error: error.code }, { status: error.status }); throw error; } }, storage: () => ({ remove: async paths => { removed.push(...paths); return { error: storageFailure ? new Error('fixture failure') : null }; }, createSignedUrl: async () => ({ data: { signedUrl: 'https://synthetic.invalid/private' } }) }) };
const modules = { 'server-only': {}, 'node:crypto': crypto, '@/lib/server': server, './server': server,
  'next/server': { connection: async () => {} },
  'next/headers': { cookies: async () => ({ get: name => cookieValues.has(name) ? { value: cookieValues.get(name) } : undefined, set: (name, value, options) => { cookieValues.set(name, value); cookieOptions.push(options); } }) },
  '@/scripts/admin-password.mjs': passwords, '@/scripts/account-deletion-core.mjs': { deleteRequestedAccount },
  'firebase-admin/app': { cert: c => c, getApps: () => [], initializeApp: () => ({}) }, 'firebase-admin/auth': { getAuth: () => ({ deleteUser: async uid => { deletedAuth.push(uid); } }) },
};
function load(path) { const loaded = { exports: {} }; const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; new Function('require','module','exports','process','fetch',source)(name => { if (name in modules) return modules[name]; throw new Error('Unexpected import ' + name); }, loaded, loaded.exports, { env: runtimeEnv }, async () => new Response('synthetic media', { headers: { 'Content-Type': 'image/jpeg' } })); return loaded.exports; }
const request = (path, method='GET', body, origin='https://test.invalid') => new Request('https://test.invalid/api/admin/' + path, { method, headers: { Origin: origin }, body: body === undefined ? undefined : JSON.stringify(body) });
try {
  await db.connect(); await query('BEGIN'); await query(readFileSync('db/018_admin.sql','utf8'));
  modules['./admin'] = modules['@/lib/admin'] = load('lib/admin.ts');
  modules['@/lib/admin-moderation'] = load('lib/admin-moderation.ts');
  modules['@/lib/account-deletions'] = load('lib/account-deletions.ts');
  const routes = Object.fromEntries(['session','password','summary','reports','media','operations','deletions','suspensions'].map(name => [name, load(`app/api/admin/${name}/route.ts`)]));
  const adminId=crypto.randomUUID(), username='fixture-'+crypto.randomBytes(8).toString('hex'), oldPassword='Temporary synthetic password!', newPassword='New synthetic administrator password!';
  await query('INSERT INTO snaproom.admin_users(id,username,password_hash) VALUES($1,$2,$3)',[adminId,username,await passwords.hashAdminPassword(oldPassword)]);
  // Guest/member cookies and random forged admin tokens never authorize administrator routes.
  cookieValues.set('snaproom_session',crypto.randomBytes(32).toString('hex'));
  for (const name of ['summary','reports','media','operations']) assert.equal((await routes[name].GET(request(name))).status,401);
  cookieValues.set('memolumi_admin',cookieValues.get('snaproom_session'));
  assert.equal((await routes.summary.GET()).status,401); cookieValues.delete('memolumi_admin');
  assert.equal((await routes.session.POST(request('session','POST',{username,password:oldPassword},'https://attacker.invalid'))).status,403);
  assert.equal((await routes.session.POST(request('session','POST',{username,password:'wrong'}))).status,401);
  assert.equal((await routes.session.POST(request('session','POST',{username,password:oldPassword}))).status,200);
  assert.equal(cookieOptions.at(-1).httpOnly,true); assert.equal(cookieOptions.at(-1).sameSite,'strict'); assert.equal(cookieOptions.at(-1).secure,true);
  assert.equal((await routes.summary.GET()).status,403);
  const oldToken=cookieValues.get('memolumi_admin');
  assert.equal((await routes.password.POST(request('password','POST',{currentPassword:oldPassword,password:newPassword}))).status,200);
  assert.equal((await query('SELECT 1 FROM snaproom.admin_sessions WHERE token_hash=$1',[hash(oldToken)])).rowCount,0);
  assert.equal((await routes.session.POST(request('session','POST',{username,password:oldPassword}))).status,401);
  assert.equal((await routes.session.POST(request('session','POST',{username,password:newPassword}))).status,200);
  const activeToken=cookieValues.get('memolumi_admin');
  assert.equal((await routes.summary.GET()).status,200);
  assert.match((await routes.summary.GET()).headers.get('cache-control'),/no-store/);
  const [author,reporter,folder,photo,record,comment,otherPhoto]=Array.from({length:7},crypto.randomUUID);
  await query('INSERT INTO snaproom.viewers(id) VALUES($1),($2)',[author,reporter]);
  await query("INSERT INTO snaproom.folders(id,owner_id,name) VALUES($1,$2,'Admin fixture')",[folder,author]);
  await query('INSERT INTO snaproom.members(folder_id,viewer_id) VALUES($1,$2),($1,$3)',[folder,author,reporter]);
  for(const [id,owner] of [[photo,author],[otherPhoto,reporter]])await query("INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,size_bytes,captured_at,shared) VALUES($1,$2,$3,'Fixture image',$4,1,now(),true)",[id,folder,owner,'admin-fixture/'+id]);
  await query("INSERT INTO snaproom.records(id,folder_id,owner_id,body,recorded_on,shared) VALUES($1,$2,$3,'Fixture story',current_date,true)",[record,folder,author]);
  await query('INSERT INTO snaproom.record_photos(record_id,photo_id,position) VALUES($1,$2,0)',[record,photo]);
  await query("INSERT INTO snaproom.comments(id,photo_id,owner_id,body) VALUES($1,$2,$3,'Fixture comment')",[comment,photo,author]);
  const reportIds=[];
  for(const [column,target] of [['photo_id',photo],['record_id',record],['comment_id',comment],['target_user_id',author]]){const id=crypto.randomUUID();reportIds.push(id);await query(`INSERT INTO snaproom.safety_reports(id,reporter_id,${column},reason) VALUES($1,$2,$3,'Synthetic report')`,[id,reporter,target]);}
  const detail=await(await routes.reports.GET(request('reports?id='+reportIds[1]))).json(); assert.equal(detail.media.length,1); assert.equal(detail.media[0].id,photo); assert.ok(!JSON.stringify(detail).includes('object_path'));
  assert.equal((await routes.media.GET(request(`media?report=${reportIds[0]}&photo=${otherPhoto}`))).status,404);
  assert.equal((await routes.media.GET(request(`media?report=${reportIds[0]}&photo=${photo}`))).status,200);
  assert.equal((await routes.reports.POST(request('reports','POST',{id:reportIds[0],action:'hide',note:'Reviewed'},'https://attacker.invalid'))).status,403);
  assert.equal((await routes.reports.POST(request('reports','POST',{id:reportIds[0],action:'hide',note:''}))).status,400);
  assert.equal((await routes.reports.POST(request('reports','POST',{id:reportIds[0],action:'hide',note:'Verified fixture'}))).status,200);
  assert.equal((await routes.reports.POST(request('reports','POST',{id:reportIds[0],action:'hide',note:'Duplicate'}))).status,409);
  assert.equal((await query('SELECT shared FROM snaproom.photos WHERE id=$1',[photo])).rows[0].shared,false);
  assert.equal((await routes.reports.POST(request('reports','POST',{id:reportIds[0],action:'restore',note:'Appeal accepted'}))).status,200);
  assert.deepEqual((await query('SELECT shared,safety_hidden FROM snaproom.photos WHERE id=$1',[photo])).rows[0],{shared:false,safety_hidden:false});
  for(const id of reportIds.slice(1,3))assert.equal((await routes.reports.POST(request('reports','POST',{id,action:'hide',note:'Reviewed fixture'}))).status,200);
  assert.equal((await query('SELECT hidden FROM snaproom.comments WHERE id=$1',[comment])).rows[0].hidden,true);
  assert.equal((await routes.reports.POST(request('reports','POST',{id:reportIds[3],action:'suspend',note:'Verified repeated abuse'}))).status,200);
  assert.equal((await query('SELECT snaproom.interaction_allowed($1,$2) AS ok',[author,reporter])).rows[0].ok,false);
  assert.equal((await routes.suspensions.POST(request('suspensions','POST',{id:author,action:'unsuspend',note:'Appeal accepted'}))).status,200);
  assert.equal((await routes.deletions.POST(request('deletions','POST',{id:author,confirm:'PROCESS_REQUESTED_DELETIONS'}))).status,409);
  const originalUid='admin-fixture-'+crypto.randomUUID();
  await query("INSERT INTO snaproom.accounts(firebase_uid,viewer_id,provider,display_name) VALUES($1,$2,'google.com','Fixture account')",[originalUid,author]);
  await query("UPDATE snaproom.viewers SET deletion_requested_at=now()-interval '10 minutes' WHERE id=$1",[author]);
  assert.equal((await routes.deletions.POST(request('deletions','POST',{id:author}))).status,400);
  assert.equal((await routes.deletions.POST(request('deletions','POST',{id:author,confirm:'PROCESS_REQUESTED_DELETIONS'}))).status,503);
  assert.equal(removed.length,0); assert.equal(deletedAuth.length,0);
  assert.equal((await query('SELECT deletion_last_error FROM snaproom.viewers WHERE id=$1',[author])).rows[0].deletion_last_error,'FIREBASE_ADMIN_NOT_CONFIGURED');
  runtimeEnv.FIREBASE_SERVICE_ACCOUNT_JSON=JSON.stringify({project_id:'test-project'}); storageFailure=true;
  assert.equal((await routes.deletions.POST(request('deletions','POST',{id:author,confirm:'PROCESS_REQUESTED_DELETIONS'}))).status,503);
  assert.equal((await query('SELECT owner_id FROM snaproom.folders WHERE id=$1',[folder])).rows[0].owner_id,author);
  assert.equal(deletedAuth.length,0); storageFailure=false;
  const deleted=await routes.deletions.POST(request('deletions','POST',{id:author,confirm:'PROCESS_REQUESTED_DELETIONS'})); assert.equal(deleted.status,200); assert.equal((await deleted.json()).completed,1);
  assert.deepEqual(deletedAuth,[originalUid]); assert.equal((await query('SELECT 1 FROM snaproom.viewers WHERE id=$1',[author])).rowCount,0);
  assert.equal((await query('SELECT owner_id FROM snaproom.folders WHERE id=$1',[folder])).rows[0].owner_id,reporter);
  assert.equal((await query('SELECT 1 FROM snaproom.photos WHERE id=$1',[otherPhoto])).rowCount,1);
  assert.equal((await routes.deletions.POST(request('deletions','POST',{id:author,confirm:'PROCESS_REQUESTED_DELETIONS'}))).status,409);
  const events=(await query('SELECT action FROM snaproom.admin_audit WHERE admin_id=$1',[adminId])).rows.map(r=>r.action);for(const event of ['password_changed','report_hide','account_unsuspended','deletion_failed','deletion_completed'])assert.ok(events.includes(event),event);
  assert.equal((await routes.operations.GET(request('operations?view=audit'))).status,200);
  assert.equal((await routes.operations.GET(request('operations?view=deletions'))).status,200);
  assert.equal((await routes.operations.GET(request('operations?view=suspended'))).status,200);
  await query('UPDATE snaproom.admin_users SET disabled=true WHERE id=$1',[adminId]);assert.equal((await routes.summary.GET()).status,401);
  await query('UPDATE snaproom.admin_users SET disabled=false WHERE id=$1',[adminId]);
  await query("UPDATE snaproom.admin_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[hash(activeToken)]);assert.equal((await routes.summary.GET()).status,401);
  const limitName='missing-'+crypto.randomBytes(8).toString('hex');
  for(let i=0;i<10;i++)assert.equal((await routes.session.POST(request('session','POST',{username:limitName,password:newPassword}))).status,401);
  assert.equal((await routes.session.POST(request('session','POST',{username:limitName,password:newPassword}))).status,429);
  console.log('PASS: isolated admin authentication, forced password rotation, expiry/disable/revocation, CSRF, rate limits, report review/restore, scoped media, suspension, audit, deletion preflight/failure/retry and shared-album preservation. No real user or external storage was modified.');
} finally { await query('ROLLBACK').catch(()=>{}); await db.end(); }
