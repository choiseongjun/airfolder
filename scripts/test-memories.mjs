import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import pg from 'pg';
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const env={...parseEnv(readFileSync('.env.local','utf8')),...process.env};
const db=new pg.Client({connectionString:env.DATABASE_URL});await db.connect();
const users=[],folders=[];let checks=0;
async function call(u,path,method='GET',body,status=200,origin=base){const r=await fetch(base+path,{method,headers:{Origin:origin,...(u?{Cookie:u.cookie}:{}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data)}`);checks++;return data;}
async function guest(){const r=await fetch(base+'/api/session',{method:'POST',headers:{Origin:base}});assert.equal(r.status,200);const d=await r.json();const u={id:d.viewerId,cookie:r.headers.get('set-cookie').split(';')[0]};users.push(u);return u;}
try{
 const a=await guest(),b=await guest(),c=await guest();
 const f=await call(a,'/api/folders','POST',{name:'Memory integration fixture'},201);folders.push(f.id);
 const invite=await call(a,'/api/invites','POST',{folderId:f.id});await call(b,'/api/join','POST',{token:invite.token});
 const id=randomUUID(),content={id,folderId:f.id,body:'A private memory',day:'2025-03-12',shared:false};
 await call(a,'/api/memories','POST',content,201);await call(a,'/api/memories','POST',content,201);
 let feed=await call(a,`/api/memories?folderId=${f.id}`);assert.equal(feed.items.length,1);assert.equal(feed.items[0].day,'2025-03-12');
 assert.equal((await call(b,`/api/memories?folderId=${f.id}`)).items.length,0);
 await call(c,`/api/memories?folderId=${f.id}`,'GET',undefined,404);
 await call(null,`/api/memories?folderId=${f.id}`,'GET',undefined,401);
 const target={kind:'record',targetId:id};
 await call(b,`/api/discussion?kind=record&id=${id}`,'GET',undefined,404);
 await call(b,'/api/discussion','POST',{...target,action:'like',liked:true},404);
 const cid=randomUUID();await call(a,'/api/discussion','POST',{...target,action:'comment',id:cid,body:'Private context'});
 await call(a,'/api/memories','PATCH',{...content,shared:true,revision:feed.items[0].revision});
 let discussion=await call(b,`/api/discussion?kind=record&id=${id}`);assert.equal(discussion.comments.length,1);
 const bid=randomUUID();await call(b,'/api/discussion','POST',{...target,action:'comment',id:bid,body:'Member comment'});
 await call(b,'/api/discussion','POST',{...target,action:'comment',id:bid,body:'Retry'});
 await call(b,'/api/discussion','POST',{...target,action:'like',liked:true});await call(b,'/api/discussion','POST',{...target,action:'like',liked:true});
 discussion=await call(b,`/api/discussion?kind=record&id=${id}`);assert.equal(discussion.count,1);assert.equal(discussion.comments.length,2);
 const bc=discussion.comments.find(x=>x.id===bid);
 await call(a,'/api/discussion','PATCH',{...target,id:bid,body:'Cannot edit others',revision:bc.revision},403);
 await call(b,'/api/discussion','PATCH',{...target,id:bid,body:'Updated',revision:bc.revision});
 await call(b,'/api/discussion','PATCH',{...target,id:bid,body:'Stale',revision:bc.revision},409);
 await call(b,'/api/memories','DELETE',{id},403);
 await call(b,'/api/memories','PATCH',{...content,revision:2},403);
 await call(a,'/api/discussion','DELETE',{...target,id:bid},403);
 await call(a,'/api/discussion','POST',{...target,action:'report',commentId:bid,reason:'Test report'});
 await call(b,`/api/moderation?folderId=${f.id}`,'GET',undefined,404);
 const reports=await call(a,`/api/moderation?folderId=${f.id}`);assert.equal(reports.reports.length,1);
 await call(b,'/api/moderation','PATCH',{id:reports.reports[0].id,action:'hide'},404);
 await call(a,'/api/moderation','PATCH',{id:reports.reports[0].id,action:'hide'});
 assert.equal((await call(b,`/api/discussion?kind=record&id=${id}`)).comments.length,1);
 feed=await call(a,`/api/memories?folderId=${f.id}`);
 await call(a,'/api/memories','PATCH',{...content,revision:feed.items[0].revision});
 await call(b,`/api/discussion?kind=record&id=${id}`,'GET',undefined,404);
 await call(b,'/api/discussion','DELETE',{...target,id:bid},404);
 await call(a,'/api/memories','POST',{...content,id:randomUUID(),day:'2026-02-30'},400);
 await call(a,'/api/memories','POST',{...content,id:randomUUID(),body:' '},400);
 await call(a,'/api/memories','POST',{...content,id:randomUUID(),shared:'true'},400);
 await call(a,'/api/memories','POST',{...content,id:randomUUID()},403,'https://untrusted.invalid');
 // A folder owner must not access another member's private record or its discussion.
 const privateB=randomUUID();await call(b,'/api/memories','POST',{...content,id:privateB},201);
 await call(a,`/api/discussion?kind=record&id=${privateB}`,'GET',undefined,404);
 // Photo interactions use the same visibility boundary without needing a storage upload.
 const photo=randomUUID();await db.query("INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,size_bytes,captured_at) VALUES($1,$2,$3,'fixture',$4,1,now())",[photo,f.id,a.id,"integration/"+photo]);
 await call(b,`/api/discussion?kind=photo&id=${photo}`,'GET',undefined,404);
 await call(a,'/api/photos','PATCH',{ids:[photo],shared:true});
 await call(b,'/api/discussion','POST',{kind:'photo',targetId:photo,action:'comment',id:randomUUID(),body:'Photo comment'});
 await call(b,'/api/discussion','POST',{kind:'photo',targetId:photo,action:'like',liked:true});
 assert.equal((await call(a,`/api/discussion?kind=photo&id=${photo}`)).count,1);
 await call(a,'/api/photos','PATCH',{ids:[photo],shared:false});
 await call(b,`/api/discussion?kind=photo&id=${photo}`,'GET',undefined,404);
 const token='snm_'+randomBytes(32).toString('hex');
 await db.query("INSERT INTO snaproom.sessions(token_hash,viewer_id,expires_at) VALUES($1,$2,now()+interval '5 minutes')",[createHash('sha256').update(token).digest('hex'),a.id]);
 const native=await fetch(base+'/api/discussion',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({...target,action:'like',liked:true})});assert.equal(native.status,200);checks++;
 const nativeRead=await fetch(base+`/api/memories?folderId=${f.id}`,{headers:{Authorization:'Bearer '+token}});assert.equal(nativeRead.status,200);checks++;
 const nativeData=await nativeRead.json();assert.ok(nativeData.items.some(i=>i.id===id));
 await call(a,`/api/memories?folderId=${f.id}&timezone=Invalid/Zone`,'GET',undefined,400);
 await db.query("UPDATE snaproom.photos SET captured_at='2025-01-01T23:30:00Z' WHERE id=$1",[photo]);
 const local=await call(a,`/api/memories?folderId=${f.id}&timezone=Asia/Seoul`);assert.equal(local.items.find(i=>i.id===photo).day,'2025-01-02');
 // Bundled stories preserve media permissions and selection order.
 const p2=randomUUID();await db.query("INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,size_bytes,captured_at,shared) VALUES($1,$2,$3,'bundle fixture',$4,1,now(),true)",[p2,f.id,a.id,"integration/"+p2]);
 const rid=randomUUID(),bundle={id:rid,folderId:f.id,title:'First day',body:'Together',day:'2026-01-01',shared:true,photoIds:[p2,photo]};
 await call(a,'/api/memories','POST',bundle,201);
 let bundled=(await call(a,`/api/memories?folderId=${f.id}`)).items.find(i=>i.id===rid);assert.deepEqual(bundled.photos.map(p=>p.id),[p2,photo]);assert.equal(bundled.title,'First day');
 assert.deepEqual((await call(b,`/api/memories?folderId=${f.id}`)).items.find(i=>i.id===rid).photos.map(p=>p.id),[p2]);
 await call(a,'/api/memories','POST',{...bundle,id:randomUUID()},409);
 await call(b,'/api/memories','POST',{...bundle,id:randomUUID()},403);
 await call(a,'/api/memories','PATCH',{...bundle,photoIds:[photo,p2],revision:bundled.revision});
 bundled=(await call(a,`/api/memories?folderId=${f.id}`)).items.find(i=>i.id===rid);assert.deepEqual(bundled.photos.map(p=>p.id),[photo,p2]);
 await call(a,'/api/memories','DELETE',{id:rid});assert.equal((await db.query('SELECT count(*)::int AS n FROM snaproom.photos WHERE id=ANY($1::uuid[])',[[photo,p2]])).rows[0].n,2);
 // Rate limiting is scoped to the author, including serialized concurrent writes.
 await db.query("INSERT INTO snaproom.records(id,folder_id,owner_id,body,recorded_on) SELECT gen_random_uuid(),$1,$2,'Rate fixture',current_date FROM generate_series(1,20)",[f.id,b.id]);
 await call(b,'/api/memories','POST',{...content,id:randomUUID()},429);
 await call(a,'/api/memories','DELETE',{id});
 await call(a,`/api/discussion?kind=record&id=${id}`,'GET',undefined,404);
 assert.equal((await db.query('SELECT count(*) FROM snaproom.comments WHERE record_id=$1',[id])).rows[0].count,'0');
 assert.equal((await db.query('SELECT count(*) FROM snaproom.reactions WHERE record_id=$1',[id])).rows[0].count,'0');
 console.log(`PASS: ${checks} memory API checks, privacy, ownership, conflict handling, moderation, photo permissions, idempotency and cascades.`);
}finally{
 await db.query('DELETE FROM snaproom.folders WHERE id=ANY($1::uuid[])',[folders]);
 await db.query('DELETE FROM snaproom.viewers WHERE id=ANY($1::uuid[])',[users.map(u=>u.id)]);await db.end();
}
