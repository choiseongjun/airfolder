const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(file,imports){
 const mod={exports:{}};
 new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(key=>{if(!(key in imports))throw Error(key);return imports[key]},mod,mod.exports);
 return mod.exports;
}
function route(photoAllowed=true){
 const inserted=[];
 class ApiError extends Error{constructor(status,message){super(message);this.status=status}}
 const db={query:async(sql,params)=>{
  if(sql.startsWith('SELECT p.id'))return {rowCount:photoAllowed?1:0,rows:[]};
  if(sql.startsWith('SELECT owner_id'))return {rowCount:0,rows:[]};
  if(sql.startsWith('INSERT'))inserted.push(params);
  return {rowCount:1,rows:[]};
 }};
 const imports={
  '@/lib/safety':{requireTerms:async()=>{},requireActiveViewer:async()=>{}},
  '@/lib/push':{notifySharedPhotos:async()=>{}},
  'node:crypto':require('node:crypto'),
  'next/server':{connection:async()=>{}},
  '@/lib/comment-note':load('lib/comment-note.ts',{}),
  '@/lib/server':{ApiError,json:r=>r.json(),sameOrigin:()=>{},viewer:async()=>'me',uuid:v=>v,transaction:fn=>fn(db),safe:async fn=>{try{return await fn()}catch(e){if(e.status)return Response.json({error:e.message},{status:e.status});throw e;}}},
  '@/lib/memories':{limitWrites:async()=>{},textBody:v=>v.trim(),targetAccess:async()=>({id:'record',column:'record_id',folder_id:'album'})},
 };
 const endpoint=load('app/api/discussion/route.ts',imports);
 return {inserted,post:extra=>endpoint.POST(new Request('https://test.invalid/api/discussion',{method:'POST',body:JSON.stringify({id:'note',kind:'record',targetId:'record',action:'comment',body:'그날 정말 즐거웠어',...extra})}))};
}
test('existing comment clients still save with cream paper and no photo',async()=>{
 const r=route();assert.equal((await r.post({})).status,200);
 assert.deepEqual(r.inserted[0],['note','record','me','그날 정말 즐거웠어','cream',null]);
});
test('selected paper and authorized photo persist together',async()=>{
 const r=route();assert.equal((await r.post({color:'lavender',photoId:'attached-photo'})).status,200);
 assert.deepEqual(r.inserted[0].slice(-2),['lavender','attached-photo']);
});
test('unsupported paper values are rejected without writing',async()=>{
 for(const color of ['red','__proto__',{},null]){
  const r=route();assert.equal((await r.post({color})).status,400);assert.equal(r.inserted.length,0);
 }
});
test('unavailable or unrelated photo cannot be attached to a comment',async()=>{
 const r=route(false);assert.equal((await r.post({photoId:'other-photo'})).status,400);assert.equal(r.inserted.length,0);
});
