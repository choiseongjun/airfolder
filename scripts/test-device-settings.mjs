import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import pg from 'pg';
const env=parseEnv(readFileSync('.env.local','utf8'));
const db=new pg.Client({connectionString:env.DATABASE_URL});
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const users=[];let checks=0;
async function call(cookie,path,method='GET',body,expected=200,origin=base){const r=await fetch(base+path,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});assert.equal(r.status,expected,`${method} ${path}`);checks++;return r;}
try{
 await db.connect();
 const response=await call(null,'/api/session','POST');const user=await response.json();users.push(user.viewerId);const cookie=response.headers.get('set-cookie').split(';')[0];
 await call(null,'/api/push','POST',{},401);
 await call(cookie,'/api/push','POST',{token:'bad',platform:'ios'},400);
 const token=`ExpoPushToken[${randomBytes(20).toString('hex')}]`;
 await call(cookie,'/api/push','POST',{token,platform:'ios'});
 await call(cookie,'/api/push','DELETE',undefined,403,'https://untrusted.example');
 await call(cookie,'/api/push','DELETE');
 assert.equal((await db.query('SELECT 1 FROM snaproom.push_devices WHERE token=$1',[token])).rowCount,0);
 await call(cookie,'/api/push','POST',{token,platform:'android'});
 await call(cookie,'/api/account','DELETE',{},400);
 await call(cookie,'/api/account','DELETE',{confirm:'DELETE'},202);
 await call(cookie,'/api/workspace','GET',undefined,401);
 assert.equal((await db.query('SELECT 1 FROM snaproom.push_devices WHERE token=$1',[token])).rowCount,0);
 assert.equal((await db.query('SELECT 1 FROM snaproom.viewers WHERE id=$1 AND deletion_requested_at IS NOT NULL',[user.viewerId])).rowCount,1);
 // Even a stale session recreated by a racing request cannot access a deleting account.
 const stale=randomBytes(32).toString('hex');await db.query("INSERT INTO snaproom.sessions VALUES($1,$2,now()+interval '1 minute')",[createHash('sha256').update(stale).digest('hex'),user.viewerId]);
 await call(`snaproom_session=${stale}`,'/api/workspace','GET',undefined,401);
 console.log(`PASS: ${checks} device/privacy API responses, token revocation and deletion isolation.`);
}finally{if(users.length)await db.query('DELETE FROM snaproom.viewers WHERE id=ANY($1::uuid[])',[users]);await db.end();}
