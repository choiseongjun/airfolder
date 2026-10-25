const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, imports = {}) {
 const mod = {exports:{}};
 const code = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(name => imports[name],mod,mod.exports);
 return mod.exports;
}
const paging = load('lib/workspace-pagination.ts');
test('workspace collects more than 2000 photos without duplicates or hidden truncation',async()=>{
 const photos=Array.from({length:2307},(_,i)=>({id:String(i)}));
 const calls=[];
 const page=offset=>({viewerId:'qa',rooms:[{count:2307}],photos:photos.slice(offset,offset+200),nextCursor:offset+200<photos.length?String(offset+200):null});
 const result=await paging.completeWorkspace(page(0),async cursor=>{calls.push(cursor);return page(Number(cursor));});
 assert.equal(result.photos.length,2307);assert.equal(new Set(result.photos.map(p=>p.id)).size,2307);assert.equal(calls.length,11);assert.equal(result.rooms[0].count,2307);assert.equal(result.nextCursor,null);
});
test('workspace fails instead of mixing accounts, looping or showing an incomplete success',async()=>{
 const first={viewerId:'a',photos:[{id:'1'}],nextCursor:'cursor'};
 await assert.rejects(paging.completeWorkspace(first,async()=>({...first,viewerId:'b'})),/SESSION_CHANGED/);
 await assert.rejects(paging.completeWorkspace(first,async()=>first),/WORKSPACE_PAGINATION_FAILED/);
 await assert.rejects(paging.completeWorkspace(first,async()=>{throw Error('NETWORK')}),/NETWORK/);
});
test('character preparation validates inputs before decoding or contacting a server',async()=>{
 const {prepareCharacterPhoto}=load('lib/character-photo.ts');
 await assert.rejects(prepareCharacterPhoto(new File(['bad'],'bad.txt',{type:'text/plain'})),/INVALID_PHOTO/);
 await assert.rejects(prepareCharacterPhoto(new File([new Uint8Array(20*1024*1024+1)],'large.jpg',{type:'image/jpeg'})),/PHOTO_TOO_LARGE/);
});
test('storage warnings use the charged budget and preserve the hard limit',()=>{
 const limit=5*1024**3;
 const {storageHealth}=load('lib/storage-quota.ts',{'./server':{},'./media-limits':{SERVICE_STORAGE_LIMIT:limit}});
 for(const [ratio,level] of [[0.69,'normal'],[0.7,'warning'],[0.85,'critical'],[1,'full'],[1.1,'full']]){
  const result=storageHealth(limit*ratio);assert.equal(result.level,level);assert.ok(result.remaining>=0);
 }
});
