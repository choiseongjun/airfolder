import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import pg from 'pg';
const env={...parseEnv(readFileSync('.env.local','utf8')),...process.env},base=process.env.TEST_BASE_URL||'http://localhost:3000';
const db=new pg.Client({connectionString:env.DATABASE_URL});await db.connect();
const id=randomUUID(),token='snm_'+randomBytes(32).toString('hex'),hash=v=>createHash('sha256').update(v).digest('hex');let count=0;
async function check(path,options,status){const r=await fetch(base+path,{redirect:'manual',...options});assert.equal(r.status,status);count++;return r;}
try{
 await db.query('INSERT INTO snaproom.viewers(id) VALUES($1)',[id]);await db.query("INSERT INTO snaproom.sessions(token_hash,viewer_id,expires_at) VALUES($1,$2,now()+interval '5 minutes')",[hash(token),id]);
 await check('/api/mobile/web-session',{},401);
 await check('/api/mobile/web-session',{headers:{Authorization:'Bearer bad'}},401);
 const response=await check('/api/mobile/web-session?lang=ko',{headers:{Authorization:'Bearer '+token}},303);
 assert.equal(response.headers.get('location'),base+'/?lang=ko');assert.equal(response.headers.get('cache-control'),'no-store');
 const cookie=response.headers.get('set-cookie');assert.ok(cookie.includes('HttpOnly'));assert.ok(cookie.includes('SameSite=lax'));assert.ok(!cookie.includes(token));
 const child=cookie.split(';')[0];
 const workspace=await check('/api/workspace',{headers:{Cookie:child}},200);assert.equal((await workspace.json()).viewerId,id);
 await check('/api/mobile/web-session',{headers:{Cookie:child}},401);
 // Refreshing bootstrap revokes the previous WebView cookie.
 const response2=await check('/api/mobile/web-session',{headers:{Authorization:'Bearer '+token}},303);
 const child2=response2.headers.get('set-cookie').split(';')[0];
 await check('/api/workspace',{headers:{Cookie:child}},401);
 // Logging out inside the website must revoke the native parent too.
 await check('/api/auth/logout',{method:'POST',headers:{Origin:base,Cookie:child2}},200);
 await check('/api/workspace',{headers:{Authorization:'Bearer '+token}},401);
 await check('/api/workspace',{headers:{Cookie:child2}},401);
 console.log(`PASS: ${count} WebView session checks: native-only bootstrap, HttpOnly cookie, same identity, rotation, and two-way logout.`);
}finally{await db.query('DELETE FROM snaproom.viewers WHERE id=$1',[id]);await db.end();}
