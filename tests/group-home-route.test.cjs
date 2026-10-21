const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('app/(workspace)/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
async function screen(params, authorization=false){
 const exports={};
 vm.runInNewContext(code,{exports,require(name){
  if(name==='react'||name==='react/jsx-runtime')return require(name);
  if(name==='@/lib/request-locale')return {requestLocale:async value=>value||'ko'};
  if(name==='next/navigation')return {redirect:url=>{throw new Error('redirect:'+url)}};
  if(name==='next/headers')return {headers:async()=>new Map(authorization?[['authorization','Bearer native']]:[])};
  if(name==='../home-feed')return {default:'home-feed'};
  if(name==='./workspace-client')return {default:'workspace'};
  if(name==='./entry-landing')return {default:'landing'};
  return {};
 }});
 const root=exports.default({searchParams:Promise.resolve(params)});
 return (await root.props.children.type(root.props.children.props)).type;
}
test('group-only crew and personal links open current Korean home feed',async()=>{
 for(const group of ['b867d69e-92ee-40d4-a85f-725edb05d087','personal'])assert.equal(await screen({group}),'home-feed');
});
test('group context does not swallow explicit workspace actions',async()=>{
 for(const extra of [{quick:'1'},{login:'1'},{album:'album-id',view:'photos'},{studio:'1'},{browse:'1'}])assert.equal(await screen({group:'personal',...extra}),'workspace');
});
test('English group links retain workspace and explicit Korean home retains feed',async()=>{
 assert.equal(await screen({lang:'en',group:'personal'}),'workspace');
 assert.equal(await screen({lang:'ko',home:'1',group:'personal'}),'home-feed');
});

test('first visits and returning Korean web visits enter the feed without an account lookup',async()=>{
 assert.equal(await screen({}),'home-feed');
 assert.equal(await screen({lang:'ko'}),'home-feed');
 assert.equal(await screen({lang:'en'}),'workspace');
 assert.equal(await screen({lang:'ko'},true),'workspace');
});

test('first-visit routing preserves sign-in, creation, albums and invitations',async()=>{
 for(const params of [{login:'1'},{loginError:'cancelled'},{quick:'1'},{album:'album-id'},{browse:'1'}])assert.equal(await screen(params),'workspace');
 const token='a'.repeat(64);
 await assert.rejects(screen({invite:token}),new RegExp('redirect:/join/'+token));
});
