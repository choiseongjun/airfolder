import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {parseEnv} from 'node:util';import {randomUUID} from 'node:crypto';import pg from 'pg';import sharp from 'sharp';import {createClient} from '@supabase/supabase-js';
const env=parseEnv(readFileSync('.env.local','utf8')),db=new pg.Client({connectionString:env.DATABASE_URL});await db.connect();
const base='http://localhost:3000',r=await fetch(base+'/api/session',{method:'POST',headers:{Origin:base}}),user=await r.json(),cookie=r.headers.get('set-cookie').split(';')[0],folder=randomUUID(),filler=randomUUID();
const store=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY).storage.from('snaproom-photos');
async function caps(){return(await fetch(base+'/api/media-limits',{headers:{Cookie:cookie}})).json();}
const bytes=await sharp({create:{width:20,height:20,channels:3,background:'#123456'}}).png().toBuffer();const preview=await sharp(bytes).rotate().resize({width:2560,height:2560,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
async function upload(){const id=randomUUID(),body=new FormData();for(const[k,v]of Object.entries({id,folderId:folder,name:'quota.png',created:String(Date.now()),shared:'false'}))body.set(k,v);body.set('file',new Blob([bytes],{type:'image/png'}),'quota.png');return fetch(base+'/api/photos',{method:'POST',headers:{Cookie:cookie,Origin:base},body});}
try{
 await db.query("INSERT INTO snaproom.folders(id,owner_id,name) VALUES($1,$2,'Disposable quota test')",[folder,user.viewerId]);await db.query('INSERT INTO snaproom.members(folder_id,viewer_id) VALUES($1,$2)',[folder,user.viewerId]);
 await db.query("INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,size_bytes,captured_at,preview_size_bytes) VALUES($1,$2,$3,'quota fixture','quota-fixture', $4,now(),0)",[filler,folder,user.viewerId,500*1048576]);
 let c=await caps();assert.equal(c.remaining,0);assert.equal(c.video,50*1048576);assert.equal(c.image,20*1048576);
 const blocked=await upload();assert.equal(blocked.status,413);assert.equal((await blocked.json()).error,'ACCOUNT_STORAGE_FULL');
 await db.query('UPDATE snaproom.photos SET size_bytes=$2 WHERE id=$1',[filler,500*1048576-bytes.length-preview.length]);
 const results=await Promise.all([upload(),upload()]);assert.deepEqual(results.map(r=>r.status).sort(),[201,413]);c=await caps();assert.equal(c.used,500*1048576);
 console.log('PASS: file limits, full-account rejection, preview accounting, concurrent upload boundary.');
}finally{const rows=await db.query('SELECT object_path,preview_path FROM snaproom.photos WHERE folder_id=$1 AND id<>$2',[folder,filler]);const paths=rows.rows.flatMap(r=>[r.object_path,r.preview_path]).filter(Boolean);if(paths.length)await store.remove(paths);await db.query('DELETE FROM snaproom.folders WHERE id=$1',[folder]);await db.query('DELETE FROM snaproom.viewers WHERE id=$1',[user.viewerId]);await db.end();}
