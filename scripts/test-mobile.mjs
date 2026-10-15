// Real API interop with synthetic identities; no third-party login or user data is modified.
import assert from 'node:assert/strict';
import { acceptTestTerms } from './test-policy-consent.mjs';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const env = {...parseEnv(readFileSync('.env.local','utf8')), ...process.env};
const db = new pg.Client({connectionString:env.DATABASE_URL});
const users = [], folders = [], paths = [];
let checks = 0;
async function call(path, {cookie, token, origin, method='GET', body, status=200} = {}) {
  const response = await fetch(base + path, { method, headers: {...(cookie ? {Cookie:cookie}:{}), ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(origin ? {Origin:origin}:{}), ...(body && !(body instanceof FormData) ? {'Content-Type':'application/json'}:{})}, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(response.status, status, `${method} ${path}`); checks++; return response;
}
async function guest() {
  const r = await call('/api/session',{method:'POST',origin:base});
  const {viewerId} = await r.json(); users.push(viewerId);
  const user = {id:viewerId,cookie:r.headers.get('set-cookie').split(';')[0]};
  await acceptTestTerms(base,user.cookie);
  return user;
}
const hex = () => randomBytes(32).toString('hex');
try {
  await db.connect();
  const owner = await guest(), guestUser = await guest(), outsider = await guest();
  await db.query("INSERT INTO snaproom.accounts(firebase_uid,viewer_id,provider,display_name) VALUES($1,$2,'google.com','Mobile test')",['test-mobile-'+randomUUID(),owner.id]);
  const verifier=hex(), challenge=createHash('sha256').update(verifier).digest('hex');
  await call('/api/mobile/authorize',{method:'POST',cookie:guestUser.cookie,origin:base,body:{challenge},status:403});
  await call('/api/mobile/authorize',{method:'POST',cookie:owner.cookie,origin:'https://untrusted.example',body:{challenge},status:403});
  const {code} = await (await call('/api/mobile/authorize',{method:'POST',cookie:owner.cookie,origin:base,body:{challenge}})).json();
  await call('/api/mobile/exchange',{method:'POST',body:{code,verifier:hex()},status:401});
  await call('/api/mobile/exchange',{method:'POST',origin:base,body:{code,verifier},status:403});
  const {token,viewerId} = await (await call('/api/mobile/exchange',{method:'POST',body:{code,verifier}})).json();
  assert.equal(viewerId,owner.id);
  await call('/api/mobile/exchange',{method:'POST',body:{code,verifier},status:401});
  await call('/api/workspace',{cookie:owner.cookie,token:'bad',status:401});
  await call('/api/workspace',{cookie:owner.cookie,token:'snm_'+hex(),status:401});
  await call('/api/folders',{method:'POST',token,origin:'https://untrusted.example',body:{name:'Denied'},status:403});
  await call('/api/folders',{method:'POST',token,body:{name:'Invalid range',startDate:'2026-02-29',endDate:'2026-03-01'},status:400});
  const {id:folder} = await (await call('/api/folders',{method:'POST',token,body:{name:'Mobile interop fixture',category:'개인',startDate:'2026-10-01',endDate:'2026-10-14'},status:201})).json(); folders.push(folder);
  const webWorkspace = await (await call('/api/workspace',{cookie:owner.cookie})).json();
  assert.equal(webWorkspace.rooms.find(f=>f.id===folder).startDate,'2026-10-01');
  const photo=randomUUID(); paths.push(`${owner.id}/${folder}/${photo}.jpg`);
  const bytes=await sharp({create:{width:8,height:8,channels:3,background:'#284d3c'}}).jpeg().toBuffer();
  const data = new FormData();
  for(const [key,value] of Object.entries({id:photo,folderId:folder,name:'Native fixture.jpg',created:String(Date.now()),shared:'false'})) data.set(key,value);
  data.set('file',new Blob([bytes],{type:'image/jpeg'}),'fixture.jpg');
  await call('/api/photos',{method:'POST',token,body:data,status:201});
  await call('/api/photos',{method:'POST',token,body:data});
  assert.equal((await (await call('/api/workspace',{cookie:owner.cookie})).json()).photos.filter(p=>p.id===photo).length,1);
  await call(`/api/photos/${photo}/content`,{token});
  const {token:invite} = await (await call('/api/invites',{method:'POST',token,body:{folderId:folder}})).json();
  await call('/api/join',{method:'POST',cookie:guestUser.cookie,origin:base,body:{token:invite}});
  await call(`/api/photos/${photo}/content`,{cookie:guestUser.cookie,status:404});
  await call('/api/photos',{method:'PATCH',token,body:{ids:[photo],shared:true}});
  await call(`/api/photos/${photo}/content`,{cookie:guestUser.cookie});
  await call(`/api/photos/${photo}/content`,{cookie:outsider.cookie,status:404});
  await call('/api/auth/logout',{method:'POST',token});
  await call('/api/workspace',{token,status:401});
  await call('/api/workspace',{cookie:owner.cookie});
  console.log(`PASS: ${checks} mobile/web API checks, one-time PKCE exchange, cookie isolation, private uploads, retry idempotency, date persistence, web invite and independent session revocation.`);
} finally {
  try {
    if (paths.length) {
      const result=await createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}}).storage.from('snaproom-photos').remove(paths);
      if(result.error) throw new Error('Fixture storage cleanup failed');
    }
  } finally {
    if(folders.length) await db.query('DELETE FROM snaproom.folders WHERE id=ANY($1::uuid[])',[folders]);
    if(users.length) { await db.query('DELETE FROM snaproom.accounts WHERE viewer_id=ANY($1::uuid[])',[users]); await db.query('DELETE FROM snaproom.viewers WHERE id=ANY($1::uuid[])',[users]); }
    await db.end();
  }
  console.log('Removed only mobile test fixtures.');
}
