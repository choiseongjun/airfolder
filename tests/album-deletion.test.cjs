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
test('originals and previews are durably queued before album removal',async()=>{
 const db=database();await mod.exports.deleteAlbum(db,'album','owner','Trip');
 assert.match(db.writes[0].sql,/storage_deletions/);assert.deepEqual(db.writes[0].params,[['a','b','c']]);
 assert.match(db.writes[1].sql,/DELETE FROM snaproom.folders/);assert.deepEqual(db.writes[1].params,['album','owner']);
});
test('failed cleanup enqueue does not delete album',async()=>{
 const db=database('owner',true,true);await assert.rejects(mod.exports.deleteAlbum(db,'album','owner','Trip'));
 assert.equal(db.writes.some(w=>w.sql.startsWith('DELETE')),false);
});
