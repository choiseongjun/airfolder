import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import pg from 'pg';
import sharp from 'sharp';
import {createClient} from '@supabase/supabase-js';
const env={...parseEnv(readFileSync('.env.local','utf8')),...process.env};
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const db=new pg.Client({connectionString:env.DATABASE_URL});await db.connect();
const store=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY).storage.from('snaproom-photos');
const users=[],folders=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
async function user(){const r=await fetch(base+'/api/session',{method:'POST',headers:{Origin:base}});assert.equal(r.status,200);const data=await r.json();users.push(data.viewerId);await db.query("UPDATE snaproom.viewers SET terms_version='2026-10-15' WHERE id=$1",[data.viewerId]);return r.headers.get('set-cookie').split(';')[0];}
async function call(cookie,path,method='GET',body,status=200){const binary=Buffer.isBuffer(body);const r=await fetch(base+path,{method,headers:{Origin:base,Cookie:cookie,'Content-Type':binary?'application/octet-stream':'application/json'},body:body===undefined?undefined:binary?body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;}
try{
 const owner=await user(),stranger=await user();
 const folder=await call(owner,'/api/folders','POST',{name:'Disposable original verification'},201);folders.push(folder.id);
 const png=await sharp(randomBytes(1800*1500*3),{raw:{width:1800,height:1500,channels:3}}).png().toBuffer();assert.ok(png.length>4.5*1024*1024);
 const fixtures=[['large.png','image/png',png],['iphone.heic','image/heic',readFileSync('artifacts/test-iphone.heic')]];
 for(const[name,mime,bytes]of fixtures){
  const id=randomUUID(),meta={id,folderId:folder.id,name,created:Date.now(),size:bytes.length,mime};
  const start=await call(owner,'/api/photos/uploads','POST',meta);
  await call(owner,`/api/photos/uploads?id=${id}&part=0`,'PUT',Buffer.alloc(3145729),413);
  await call(owner,`/api/photos/uploads?id=${id}&part=16`,'PUT',Buffer.alloc(1),400);
  await call(stranger,'/api/photos/uploads','POST',meta,404);
  await call(owner,'/api/photos','POST',{uploadId:id},409);
  for(let part=0;part<Math.ceil(bytes.length/start.chunkSize);part++){
   const chunk=bytes.subarray(part*start.chunkSize,(part+1)*start.chunkSize);
   await call(owner,`/api/photos/uploads?id=${id}&part=${part}`,'PUT',chunk);
   if(part===0){await call(owner,`/api/photos/uploads?id=${id}&part=0`,'PUT',chunk);await call(stranger,`/api/photos/uploads?id=${id}&part=0`,'PUT',chunk,404);const resumed=await call(owner,'/api/photos/uploads','POST',meta);assert.deepEqual(resumed.parts,[0]);}
  }
  await call(owner,'/api/photos','POST',{uploadId:id},201);
  assert.equal((await call(owner,'/api/photos/uploads','POST',meta)).complete,true);
  const original=await fetch(`${base}/api/photos/${id}/content?download=1`,{headers:{Cookie:owner}});assert.equal(original.status,200);assert.equal(hash(Buffer.from(await original.arrayBuffer())),hash(bytes));assert.match(original.headers.get('content-disposition'),new RegExp(name));
  const preview=await fetch(`${base}/api/photos/${id}/content`,{headers:{Cookie:owner}});assert.equal(preview.status,200);assert.equal(preview.headers.get('content-type'),'image/jpeg');const jpg=Buffer.from(await preview.arrayBuffer());assert.notEqual(hash(jpg),hash(bytes));const dims=await sharp(jpg).metadata();assert.ok(dims.width<=2560&&dims.height<=2560);
  assert.equal((await fetch(`${base}/api/photos/${id}/content?download=1`,{headers:{Cookie:stranger}})).status,404);
  console.log(`PASS ${name}: ${bytes.length} original bytes preserved; JPEG preview ${jpg.length} bytes; resume and access checks`);
 }
}finally{
 const rows=await db.query('SELECT object_path,preview_path FROM snaproom.photos WHERE folder_id=ANY($1::uuid[])',[folders]);
 const paths=rows.rows.flatMap(r=>[r.object_path,r.preview_path].filter(Boolean));if(paths.length){const result=await store.remove(paths);if(result.error)throw result.error;}
 await db.query('DELETE FROM snaproom.folders WHERE id=ANY($1::uuid[])',[folders]);await db.query('DELETE FROM snaproom.viewers WHERE id=ANY($1::uuid[])',[users]);await db.end();
}
