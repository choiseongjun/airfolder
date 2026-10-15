import assert from 'node:assert/strict';
import { acceptTestTerms } from './test-policy-consent.mjs';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import pg from 'pg';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {createClient} from '@supabase/supabase-js';
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const env={...parseEnv(readFileSync('.env.local','utf8')),...process.env};
const db=new pg.Client({connectionString:env.DATABASE_URL});await db.connect();
const store=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY).storage.from('snaproom-photos');
const users=[],folders=[];let checks=0;
async function call(u,path,method='GET',body,status=200){const r=await fetch(base+path,{method,headers:{Origin:base,...(u?{Cookie:u.cookie}:{}),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data)}`);checks++;return data;}
async function guest(){const r=await fetch(base+'/api/session',{method:'POST',headers:{Origin:base}});assert.equal(r.status,200);const d=await r.json(),u={id:d.viewerId,cookie:r.headers.get('set-cookie').split(';')[0]};users.push(u);await acceptTestTerms(base,u.cookie);return u;}
async function content(u,id,suffix='',status=200,headers={}){const r=await fetch(base+`/api/photos/${id}/content${suffix}`,{headers:{...headers,...(u?{Cookie:u.cookie}:{})}});assert.equal(r.status,status);checks++;return r;}
const digest=b=>createHash('sha256').update(b).digest('hex');
try{
 const [a,b,c,out]=await Promise.all([guest(),guest(),guest(),guest()]);
 const f=await call(a,'/api/folders','POST',{name:'Disposable media verification'},201);folders.push(f.id);
 const invite=await call(a,'/api/invites','POST',{folderId:f.id});
 for(const u of [b,c])await call(u,'/api/join','POST',{token:invite.token});
 const members=await call(b,`/api/members?folderId=${f.id}`);assert.equal(members.members.length,3);assert.equal(members.members.filter(m=>m.mine).length,1);assert.ok(!JSON.stringify(members).includes('email'));
 await call(out,`/api/members?folderId=${f.id}`,'GET',undefined,404);
 const image=await sharp({create:{width:4000,height:2700,channels:3,background:'#cc9933'}}).png().toBuffer();
 const video=readFileSync(process.env.TEST_VIDEO_FILE||'artifacts/test-original.mp4');
 const ids=[];
 async function upload(bytes,name,mime,id=randomUUID(),status=201){const body=new FormData();for(const[k,v]of Object.entries({id,folderId:f.id,name,created:String(Date.now()),shared:'false'}))body.set(k,v);body.set('file',new Blob([bytes],{type:mime}),name);await call(a,'/api/photos','POST',body,status);return id;}
 ids.push(await upload(image,'original.png','image/png'));
 ids.push(await upload(video,'original.mp4','video/mp4'));
 await content(a,ids[1],'',425); // Never stream the original while encoding.
 execFileSync(process.execPath,['scripts/process-media.mjs','--once'],{stdio:'pipe'});
 const encoded=await content(a,ids[1]);assert.equal(encoded.headers.get('content-type'),'video/mp4');const encodedBytes=Buffer.from(await encoded.arrayBuffer());assert.notEqual(digest(encodedBytes),digest(video));if(video.length>50*1024*1024)assert.ok(encodedBytes.length<video.length);console.log(`Video original: ${video.length} bytes; playback: ${encodedBytes.length} bytes`);
 const state=await call(a,`/api/photos/${ids[1]}/content?status=1`);assert.equal(state.status,'ready');
 const caps=await call(a,'/api/media-limits');assert.ok(caps.video>0);
 await upload(image,'retry.png','image/png',ids[0]);
 assert.equal((await db.query('SELECT count(*)::int n FROM snaproom.photos WHERE folder_id=$1',[f.id])).rows[0].n,2);
 const original=await content(a,ids[0],'?download=1');assert.equal(digest(Buffer.from(await original.arrayBuffer())),digest(image));assert.match(original.headers.get('content-disposition'),/original.png/);
 const preview=await content(a,ids[0]);assert.equal(preview.headers.get('content-type'),'image/jpeg');assert.equal((await sharp(Buffer.from(await preview.arrayBuffer())).metadata()).width,2560);
 const movie=await content(a,ids[1],'?download=1');assert.equal(movie.headers.get('content-type'),'video/mp4');assert.equal(digest(Buffer.from(await movie.arrayBuffer())),digest(video));
 const partial=await content(a,ids[1],'',206,{Range:'bytes=0-31'});assert.equal((await partial.arrayBuffer()).byteLength,32);assert.match(partial.headers.get('content-range'),/^bytes 0-31\//);
 await content(b,ids[0],'?download=1',404);await content(null,ids[1],'',401);
 await upload(Buffer.from('<svg/>'),'fake.jpg','image/jpeg',randomUUID(),400);
 await call(a,'/api/photos','PATCH',{ids,shared:true,recipients:[out.id]},400);
 await content(b,ids[0],'',404);
 await call(a,'/api/photos','PATCH',{ids,shared:true,recipients:[b.id]});
 await content(b,ids[0],'?download=1');await content(b,ids[1]);await content(c,ids[0],'',404);await content(c,ids[1],'?download=1',404);
 for(const path of ['/api/workspace',`/api/memories?folderId=${f.id}`,`/api/face-candidates?folderId=${f.id}`]){
   const mine=await call(b,path),hidden=await call(c,path);
   assert.ok(JSON.stringify(mine).includes(ids[0]));assert.ok(!JSON.stringify(hidden).includes(ids[0]));
 }
 const faces=await call(b,`/api/face-candidates?folderId=${f.id}`);assert.equal(faces.items.length,1);
 await call(out,`/api/face-candidates?folderId=${f.id}`,'GET',undefined,404);
 await call(b,'/api/discussion','POST',{kind:'photo',targetId:ids[0],action:'comment',id:randomUUID(),body:'Selected-member discussion'});
 await call(c,`/api/discussion?kind=photo&id=${ids[0]}`,'GET',undefined,404);
 await call(c,'/api/discussion','POST',{kind:'photo',targetId:ids[0],action:'like',liked:true},404);
 await call(b,'/api/photos','PATCH',{ids,shared:true},403);
 await call(a,'/api/photos','PATCH',{ids,shared:true,recipients:[c.id]});
 await content(b,ids[0],'',404);await call(b,`/api/discussion?kind=photo&id=${ids[0]}`,'GET',undefined,404);await content(c,ids[0]);
 await call(a,'/api/photos','PATCH',{ids,shared:true,recipients:[]});await content(b,ids[0]);
 await call(a,'/api/photos','PATCH',{ids,shared:false,recipients:[b.id]},400);
 await call(a,'/api/photos','PATCH',{ids,shared:false});await content(b,ids[0],'',404);await content(c,ids[0],'',404);
 const record={id:randomUUID(),folderId:f.id,body:'Selected record',day:'2026-10-14',shared:true,recipients:[c.id]};
 await call(b,'/api/memories','POST',record,201);
 assert.ok((await call(c,`/api/memories?folderId=${f.id}`)).items.some(i=>i.id===record.id));
 assert.ok(!(await call(a,`/api/memories?folderId=${f.id}`)).items.some(i=>i.id===record.id));
 const comment=randomUUID();await call(c,'/api/discussion','POST',{kind:'record',targetId:record.id,action:'comment',id:comment,body:'Private to selected members'});
 await call(b,'/api/discussion','POST',{kind:'record',targetId:record.id,action:'report',commentId:comment,reason:'Test'});
 assert.equal((await call(a,`/api/moderation?folderId=${f.id}`)).reports.length,0);
 await call(a,`/api/discussion?kind=record&id=${record.id}`,'GET',undefined,404);
 const report=(await db.query('SELECT id FROM snaproom.comment_reports WHERE comment_id=$1',[comment])).rows[0].id;
 await call(a,'/api/moderation','PATCH',{id:report,action:'hide'},404);
 const revision=(await call(b,`/api/memories?folderId=${f.id}`)).items.find(i=>i.id===record.id).revision;
 await call(b,'/api/memories','PATCH',{...record,recipients:[a.id],revision});await call(c,`/api/discussion?kind=record&id=${record.id}`,'GET',undefined,404);
 assert.equal((await call(a,`/api/moderation?folderId=${f.id}`)).reports.length,1);
 // Membership remains mandatory even if the user's ID remains in a recipient list.
 await call(a,'/api/photos','PATCH',{ids,shared:true,recipients:[b.id]});
 await db.query('DELETE FROM snaproom.members WHERE folder_id=$1 AND viewer_id=$2',[f.id,b.id]);await content(b,ids[0],'',404);
 console.log(`PASS: ${checks} media/access requests; exact original bytes, image previews, video range playback, recipient changes, comments, moderation, face-search boundaries.`);
}finally{
 const files=await db.query('SELECT object_path,preview_path FROM snaproom.photos WHERE folder_id=ANY($1::uuid[])',[folders]);
 const paths=files.rows.flatMap(p=>[p.object_path,p.preview_path].filter(Boolean));if(paths.length){const r=await store.remove(paths);if(r.error)console.error('Fixture storage cleanup failed');}
 await db.query('DELETE FROM snaproom.folders WHERE id=ANY($1::uuid[])',[folders]);await db.query('DELETE FROM snaproom.viewers WHERE id=ANY($1::uuid[])',[users.map(u=>u.id)]);await db.end();
}
