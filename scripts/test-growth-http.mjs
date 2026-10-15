// Local-server smoke test. Creates disposable viewers/albums and removes only those fixtures.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
const base = 'http://localhost:3000';
const env = { ...parseEnv(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')), ...process.env };
const db = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const viewers = [], folders = [], groups = [];
async function request(path, cookie, body, expected = 200, method = 'POST') {
 const response = await fetch(base + path, { method, headers: { origin: base, ...(cookie ? { cookie } : {}), ...(body !== undefined ? { 'content-type':'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
 const result = await response.json(); assert.equal(response.status, expected, `${path}: ${result.error || response.status}`); return { result, response };
}
async function session() { const { result, response } = await request('/api/session'); viewers.push(result.viewerId); return response.headers.get('set-cookie').split(';')[0]; }
try {
 await db.connect();
 const host = await session(), guest = await session();
 await request('/api/policy',host,{version:'2026-10-15',accepted:true});
 const creationId=randomUUID(), albumBody={name:'Growth smoke test — disposable',category:'모임',source:'organizer',creationId};
 const album=(await request('/api/folders',host,albumBody,201)).result.id; folders.push(album);
 assert.equal((await request('/api/folders',host,albumBody,201)).result.id,album);
 const token=(await request('/api/invites',host,{folderId:album})).result.token;
 assert.equal((await request('/api/join/preview',guest,{token})).result.kind,'album');
 await request('/api/join',guest,{token},403);
 await request('/api/policy',guest,{version:'2026-10-15',accepted:true});
 const joined=(await request('/api/join',guest,{token})).result; assert.equal(joined.albums[0].id,album);
 const id=randomUUID(), bytes=await sharp({create:{width:12,height:12,channels:3,background:'#698451'}}).png().toBuffer();
 const upload={id,folderId:album,name:'smoke.png',created:Date.now(),shared:true,size:bytes.length,mime:'image/png'};
 const staged=(await request('/api/photos/uploads',guest,upload)).result; assert.equal(staged.complete,false);
 const part=await fetch(`${base}/api/photos/uploads?id=${id}&part=0`,{method:'PUT',headers:{origin:base,cookie:guest,'content-type':'application/octet-stream'},body:bytes});assert.equal(part.status,200);
 assert.equal((await request('/api/photos',guest,{uploadId:id},201)).result.id,id);
 assert.equal((await request('/api/photos/uploads',guest,upload)).result.complete,true);
 const saved=await db.query('SELECT shared,owner_id FROM snaproom.photos WHERE id=$1',[id]);assert.equal(saved.rows[0].shared,true);assert.equal(saved.rows[0].owner_id,viewers[1]);
 // A different origin cannot forge completed outcomes, even with a session cookie.
 await request('/api/analytics/events',guest,{event:'upload_succeeded',id:randomUUID(),contextId:album},400);
 const group=(await request('/api/groups',host,{name:'Disposable group'},201)).result.id;groups.push(group);
 const groupToken=(await request('/api/groups',host,{id:group,action:'invite'},200,'PATCH')).result.token;
 assert.equal((await request('/api/join/preview',guest,{token:groupToken})).result.kind,'group');
 assert.equal((await request('/api/join',guest,{token:groupToken})).result.albums.length,0);
 await request('/api/groups',host,{id:group,action:'revoke'},200,'PATCH');
 await request('/api/join/preview',guest,{token:groupToken},404);
 await db.query("UPDATE snaproom.invites SET expires_at=now()-interval '1 second' WHERE folder_id=$1",[album]);
 await request('/api/join/preview',guest,{token},404);
 // after() commits asynchronously; allow a bounded wait for the verified completion record.
 let recorded;
 for(let n=0;n<12;n++){recorded=(await db.query("SELECT count(*)::int n FROM snaproom.growth_events WHERE event='upload_succeeded' AND context_id=$1",[album])).rows[0].n;if(recorded)break;await new Promise(resolve=>setTimeout(resolve,250));}
 assert.equal(recorded,1);
 assert.equal((await db.query("SELECT count(*)::int n FROM snaproom.growth_events WHERE event='album_created' AND context_id=$1",[album])).rows[0].n,1);
 console.log('PASS: create retry, consent gate, album/group invite, staged image upload, completion deduplication, client spoof rejection and expired/revoked links.');
} catch(error) { console.error('Growth HTTP smoke failed:',error instanceof assert.AssertionError ? error.message : error.code || error.name);process.exitCode=1; }
finally {
 try {
  if(viewers.length){
   const paths=await db.query('SELECT object_path,preview_path FROM snaproom.photos WHERE owner_id=ANY($1::uuid[])',[viewers]);
   const objects=paths.rows.flatMap(row=>[row.object_path,row.preview_path].filter(Boolean));
   if(objects.some(path=>!viewers.some(id=>path.startsWith(id+'/'))))throw new Error('Unexpected fixture path');
   if(objects.length){const result=await createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}}).storage.from('snaproom-photos').remove(objects);if(result.error)throw new Error('Fixture storage cleanup failed');}
   await db.query('DELETE FROM snaproom.folders WHERE id=ANY($1::uuid[]) AND owner_id=ANY($2::uuid[])',[folders,viewers]);
   await db.query('DELETE FROM snaproom.groups WHERE id=ANY($1::uuid[]) AND owner_id=ANY($2::uuid[])',[groups,viewers]);
   await db.query('DELETE FROM snaproom.viewers WHERE id=ANY($1::uuid[])',[viewers]);
  }
  console.log('Disposable test data cleaned up.');
 } catch(error){console.error('Fixture cleanup needs review:',error.code||error.name);process.exitCode=1;}
 await db.end();
}
