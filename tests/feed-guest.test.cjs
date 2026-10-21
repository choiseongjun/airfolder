const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('app/home-feed.tsx','utf8')+'\nexport { fetchFeed };',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function loader(api){
 const exports={};
 vm.runInNewContext(code,{exports,Error,URLSearchParams,Intl,require(name){
  if(name==='@/lib/client-api')return {api};
  return {};
 }});
 return exports.fetchFeed;
}
test('missing and expired sessions can browse examples without creating a session',async()=>{
 for(const error of ['SESSION_REQUIRED','SESSION_EXPIRED']){
  const urls=[];
  const feed=await loader(async url=>{urls.push(url);throw new Error(error);})(null);
  assert.equal(feed.me,'');assert.equal(feed.items.length,0);assert.equal(feed.albums.length,0);
  assert.equal(urls.length,1);assert.match(urls[0],/^\/api\/feed\?/);
 }
});
test('private feed data is preserved and server failures are not replaced by examples',async()=>{
 const own={me:'viewer',items:[{id:'private-record'}],albums:[{id:'my-album'}]};
 assert.equal(await loader(async()=>own)('personal'),own);
 await assert.rejects(loader(async()=>{throw new Error('SERVER_ERROR')})(null),/SERVER_ERROR/);
});
