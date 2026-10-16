const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
class ApiError extends Error {constructor(status,code){super(code);this.status=status;}}
const mod={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('lib/album-deletion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(()=>({ApiError}),mod,mod.exports);
function database(owner='owner',exists=true,failQueue=false){
 const writes=[];
 return {writes,query:async(sql,params)=>{
  if(sql.startsWith('SELECT name'))return {rowCount:exists?1:0,rows:exists?[{owner_id:owner,name:'Trip'}]:[]};
  if(sql.startsWith('SELECT object'))return {rows:[{object_path:'a',preview_path:'b'},{object_path:'c',preview_path:null}]};
  writes.push({sql,params});if(failQueue&&sql.startsWith('INSERT'))throw Error('queue unavailable');return {rowCount:1};
 }};
}
test('album deletion rejects non-owner, missing album and wrong confirmation name without mutations',async()=>{
 for(const [db,who,name,status] of [[database(),'guest','Trip',403],[database('owner',false),'owner','Trip',404],[database(),'owner','Wrong',400]]){
  await assert.rejects(mod.exports.deleteAlbum(db,'album',who,name),e=>e.status===status);assert.equal(db.writes.length,0);
 }
});
test('moving to trash retains originals and sets an idempotent retention timestamp',async()=>{
 const db=database();await mod.exports.deleteAlbum(db,'album','owner','Trip');
 assert.equal(db.writes.length,1);assert.match(db.writes[0].sql,/deleted_at=COALESCE\(deleted_at,now\(\)\)/);
 assert.equal(db.writes.some(w=>/DELETE|storage_deletions/.test(w.sql)),false);
});
test('restore is owner-scoped and enforces the 30 day cutoff on the server',async()=>{
 let query;const db={query:async(sql,params)=>{query={sql,params};return {rowCount:0};}};
 await assert.rejects(mod.exports.restoreAlbum(db,'album','guest'),e=>e.status===404);
 assert.match(query.sql,/owner_id=\$2/);assert.match(query.sql,/deleted_at>now\(\)-interval '30 days'/);assert.deepEqual(query.params,['album','guest']);
});
test('purge skips albums which are not expired, including restored albums',async()=>{
 const queries=[];await mod.exports.purgeExpiredAlbum({query:async sql=>{queries.push(sql);return {rowCount:0};}},'album');
 assert.equal(queries.length,1);assert.match(queries[0],/deleted_at<=now\(\)-interval '30 days'/);
});
test('expired album is queued before deletion and queue failures preserve album',async()=>{
 for(const fail of [false,true]){
  const db=database('owner',true,fail);const query=db.query;db.query=async(sql,p)=>sql.startsWith('SELECT id')?{rowCount:1}:query(sql,p);
  if(fail)await assert.rejects(mod.exports.purgeExpiredAlbum(db,'album'));else await mod.exports.purgeExpiredAlbum(db,'album');
  assert.match(db.writes[0].sql,/storage_deletions/);assert.deepEqual(db.writes[0].params,[['a','b','c']]);
  assert.equal(db.writes.some(w=>w.sql.startsWith('DELETE')),!fail);
 }
});
