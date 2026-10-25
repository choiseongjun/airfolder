import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import sharp from 'sharp';
import {createClient} from '@supabase/supabase-js';
import {acceptTestTerms} from './test-policy-consent.mjs';
const base=process.env.TEST_BASE||'http://localhost:3004';
const env=parseEnv(readFileSync(new URL('../.env.local',import.meta.url),'utf8'));
const db=new pg.Client({connectionString:env.DATABASE_URL,connectionTimeoutMillis:15000}),viewers=[];
async function call(cookie,path,body,expected=200,method=body===undefined?'GET':'POST'){
 const r=await fetch(base+path,{method,headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,expected,`${path}: ${data.error||r.status}`);return {data,response:r};
}
async function session(){const {data,response}=await call(null,'/api/session',{});viewers.push(data.viewerId);return response.headers.get('set-cookie').split(';')[0];}
async function photo(cookie,folder,shared){const bytes=await sharp({create:{width:80,height:60,channels:3,background:shared?'#dfac85':'#333333'}}).png().toBuffer(),id=randomUUID();await call(cookie,'/api/photos/uploads',{id,folderId:folder,name:'Disposable QA photo',created:Date.now(),shared,size:bytes.length,mime:'image/png'});const r=await fetch(`${base}/api/photos/uploads?id=${id}&part=0`,{method:'PUT',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/octet-stream'},body:bytes});assert.equal(r.status,200);await call(cookie,'/api/photos',{uploadId:id},201);return id;}
try{
 await db.connect();const host=await session(),guest=await session(),stranger=await session();await acceptTestTerms(base,host);
 const folder=(await call(host,'/api/folders',{name:'Memory loop QA — disposable',category:'여행'},201)).data.id;
 const shared=await photo(host,folder,true),privateId=await photo(host,folder,false);
 const token=(await call(host,'/api/invites',{folderId:folder})).data.token;
 await call(guest,'/api/join',{token,name:'QA Guest'});
 const preview=(await call(guest,'/api/join/album',{token})).data;assert(preview.items.some(p=>p.id===shared));assert(!preview.items.some(p=>p.id===privateId));
 await call(guest,'/api/rolling-paper',{folderId:folder,body:'Before consent'},403);await acceptTestTerms(base,guest);
 const note=randomUUID();await call(guest,'/api/discussion',{id:note,kind:'photo',targetId:shared,action:'comment',body:'가'.repeat(1000)});
 await call(guest,'/api/discussion',{id:note,kind:'photo',targetId:shared,action:'comment',body:'가'.repeat(1000)});
 await call(guest,'/api/discussion',{id:randomUUID(),kind:'photo',targetId:privateId,action:'comment',body:'Must not write'},404);
 const paper=randomUUID();await call(guest,'/api/rolling-paper',{id:paper,folderId:folder,body:'b'.repeat(1000)},201);await call(guest,'/api/rolling-paper',{id:paper,folderId:folder,body:'b'.repeat(1000)},201);await call(guest,'/api/rolling-paper',{folderId:folder,body:'b'.repeat(1001)},400);
 const manifest=(await call(guest,`/api/album-export?folderId=${folder}`)).data;assert.equal(manifest.photos.length,1);assert.equal(manifest.photos[0].id,shared);assert.equal(manifest.photos[0].comments[0].body.length,1000);assert.equal(manifest.notes.length,1);
 await call(stranger,`/api/album-export?folderId=${folder}`,undefined,404);
 const notices=(await call(host,'/api/notifications')).data.items;assert(notices.some(n=>n.kind==='note'));assert(notices.some(n=>n.kind==='comment'));
 await db.query('UPDATE snaproom.rolling_paper_notes SET hidden=true WHERE id=$1',[paper]);assert(!(await call(host,'/api/notifications')).data.items.some(n=>n.kind==='note'));
 const key=(await call(host,'/api/web-push')).data.publicKey;assert.match(key,/^[\w-]{87}$/);
 await call(host,'/api/web-push',{endpoint:'https://127.0.0.1/internal',keys:{p256dh:'x',auth:'x'}},400);
 await call(guest,'/api/analytics/events',{event:'note_created',id:randomUUID()},400);
 for(let i=0;i<20;i++){const rows=await db.query("SELECT count(*)::int n FROM snaproom.growth_events WHERE event='note_created' AND context_id=$1",[folder]);if(rows.rows[0].n===2)break;await new Promise(r=>setTimeout(r,250));}
 assert.equal((await db.query("SELECT count(*)::int n FROM snaproom.growth_events WHERE event='note_created' AND context_id=$1",[folder])).rows[0].n,2);
 await db.query("UPDATE snaproom.invites SET expires_at=now()-interval '1 second' WHERE folder_id=$1",[folder]);await call(stranger,'/api/join',{token,name:'Stranger'},404);
 if(process.env.KEEP_MEMORY_QA==='1'){
  await db.query("UPDATE snaproom.invites SET expires_at=now()+interval '1 hour' WHERE folder_id=$1",[folder]);await db.query('UPDATE snaproom.rolling_paper_notes SET hidden=false WHERE id=$1',[paper]);
  writeFileSync(new URL('../output/memory-loop-fixture.json',import.meta.url),JSON.stringify({base,host,guest,folder,token,shared,viewers}));
 }
 console.log('PASS: anonymous invitation, consent, 1000-character notes, idempotency, private-photo isolation, export permissions, notification visibility, push validation, server-only metrics, expired invites.');
}catch(e){console.error(e instanceof assert.AssertionError?e.message:e.code||e.name);process.exitCode=1;}
finally{if(viewers.length && process.env.KEEP_MEMORY_QA!=='1'){const rows=await db.query('SELECT object_path,preview_path FROM snaproom.photos WHERE owner_id=ANY($1::uuid[])',[viewers]);const paths=rows.rows.flatMap(p=>[p.object_path,p.preview_path].filter(Boolean));assert(paths.every(p=>viewers.some(id=>p.startsWith(id+'/'))));if(paths.length){const result=await createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}}).storage.from('snaproom-photos').remove(paths);if(result.error)throw Error('Fixture cleanup failed');}await db.query('DELETE FROM snaproom.folders WHERE owner_id=ANY($1::uuid[])',[viewers]);await db.query('DELETE FROM snaproom.viewers WHERE id=ANY($1::uuid[])',[viewers]);}await db.end();}
