// Integration test against the configured server. Creates and removes only its own fixtures.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const env = { ...parseEnv(readFileSync('.env.local', 'utf8')), ...process.env };
const users = [], folders = [], paths = [];
let checks = 0;
async function call(user, path, method = 'GET', body, status = 200, origin = base) {
  const response = await fetch(base + path, { method, headers: { Origin: origin, ...(user ? { Cookie: user.cookie } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(response.status, status, `${method} ${path} status`); checks++;
  return response;
}
async function guest() {
  const response = await call(null, '/api/session', 'POST');
  const { viewerId } = await response.json();
  const user = { id: viewerId, cookie: response.headers.get('set-cookie').split(';')[0] }; users.push(user); return user;
}
const workspace = async user => (await call(user, '/api/workspace')).json();
async function upload(user, folder, id, image, status = 201) {
  paths.push(`${user.id}/${folder}/${id}.jpg`);
  const data = new FormData();
  for (const [key,value] of Object.entries({ folderId: folder, id, name: 'Integration fixture.jpg', created: String(Date.now()), shared: 'false' })) data.set(key,value);
  data.set('file', new Blob([image], {type:'image/jpeg'}), 'fixture.jpg');
  await call(user,'/api/photos','POST',data,status);
}
try {
  await call(null,'/api/workspace','GET',undefined,401);
  await call(null,'/api/session','POST',undefined,403,'https://untrusted.example');
  const a = await guest(), b = await guest(), c = await guest();
  const repeated = await (await call(a,'/api/session','POST')).json(); assert.equal(repeated.viewerId,a.id);
  const folder = await (await call(a,'/api/folders','POST',{name:'API integration fixture',category:'개인'},201)).json(); folders.push(folder.id);
  const image = await sharp({create:{width:8,height:8,channels:3,background:'#df8558'}}).jpeg().toBuffer();
  const p = randomUUID(), q = randomUUID();
  await upload(a,folder.id,p,image);
  await upload(a,folder.id,p,image,200);
  assert.equal((await workspace(a)).photos.length,1);
  assert.equal((await workspace(b)).rooms.length,0);
  await call(a,`/api/photos/${p}/content`);
  await call(b,`/api/photos/${p}/content`,'GET',undefined,404);
  const invite = await (await call(a,'/api/invites','POST',{folderId:folder.id})).json();
  await call(b,'/api/join','POST',{token:invite.token});
  assert.equal((await workspace(b)).photos.length,0);
  await call(b,`/api/photos/${p}/content`,'GET',undefined,404);
  await call(a,'/api/photos','PATCH',{ids:[p],shared:true});
  assert.equal((await workspace(b)).photos.length,1);
  await call(b,`/api/photos/${p}/content`);
  await call(c,`/api/photos/${p}/content`,'GET',undefined,404);
  await call(b,'/api/photos','PATCH',{ids:[p],shared:false},403);
  await call(b,'/api/invites','POST',{folderId:folder.id},403);
  await upload(b,folder.id,q,image);
  assert.equal((await workspace(a)).photos.length,1); // Folder owner cannot see another member's private photo.
  await call(a,`/api/photos/${q}/content`,'GET',undefined,404);
  await call(b,'/api/photos','PATCH',{ids:[q,p],shared:true},403);
  assert.equal((await workspace(b)).photos.find(photo=>photo.id===q).shared,false); // Atomic failure.
  await call(b,'/api/photos','PATCH',{ids:[q],shared:true});
  assert.equal((await workspace(a)).photos.length,2);
  await call(a,'/api/photos','PATCH',{ids:[p],shared:false});
  await call(b,`/api/photos/${p}/content`,'GET',undefined,404);
  await upload(a,folder.id,randomUUID(),Buffer.from('not an image'),400);
  await call(c,'/api/join','POST',{token:'bad'},400);
  await call(a,'/api/folders','POST',null,400);
  await call(null,'/api/auth/firebase','POST',{idToken:'invalid'},401);
  await call(a,'/api/auth/firebase','POST',{idToken:'invalid'},400);
  await call(a,'/api/auth/firebase','POST',{idToken:'x'.repeat(200)},env.FIREBASE_PROJECT_ID ? 401 : 503);
  await call(c,'/api/auth/logout','POST',undefined,403,'https://untrusted.example');
  await call(c,'/api/auth/logout','POST');
  await call(c,'/api/workspace','GET',undefined,401);
  console.log(`PASS: ${checks} API responses plus privacy, idempotency and atomic-sharing assertions.`);
} finally {
  const storage = createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}}).storage.from('snaproom-photos');
  if(paths.length) { const result = await storage.remove([...new Set(paths)]); if(result.error) throw new Error('Test storage cleanup failed'); }
  const db = new pg.Client({connectionString:env.DATABASE_URL});
  try { await db.connect(); await db.query('BEGIN');
    if(folders.length) await db.query('DELETE FROM snaproom.folders WHERE id=ANY($1::uuid[])', [folders]);
    if(users.length) await db.query('DELETE FROM snaproom.viewers WHERE id=ANY($1::uuid[])', [users.map(u=>u.id)]);
    await db.query('COMMIT');
  } finally { await db.end(); }
  console.log('Cleaned up integration fixtures.');
}
