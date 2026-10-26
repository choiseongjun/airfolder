const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('app/(workspace)/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
async function screen(params, authorization=false, returning=false){
 const exports={};
 vm.runInNewContext(code,{exports,URLSearchParams,require(name){
  if(name==='react'||name==='react/jsx-runtime')return require(name);
  if(name==='@/lib/request-locale')return {requestLocale:async value=>value||'ko'};
  if(name==='next/navigation')return {redirect:url=>{throw new Error('redirect:'+url)}};
  if(name==='next/headers')return {headers:async()=>new Map(authorization?[['authorization','Bearer native']]:[]),cookies:async()=>new Map(returning?[['snaproom_session','existing']]:[])};
  if(name==='../memory-intro')return {default:'memory-intro'};
  if(name==='../keepsake-workspace')return {default:'keepsake-workspace'};
  if(name==='../keepsake-login')return {default:'keepsake-login'};
  if(name==='./workspace-client')return {default:'workspace'};
  if(name==='./entry-landing')return {default:'landing'};
  return {};
 }});
 const root=exports.default({searchParams:Promise.resolve(params)});
 return (await root.props.children.type(root.props.children.props)).type;
}
test('group-only crew and personal links open current Korean book home',async()=>{
 for(const group of ['b867d69e-92ee-40d4-a85f-725edb05d087','personal'])assert.equal(await screen({group}),'keepsake-workspace');
});
test('group context does not swallow explicit workspace actions',async()=>{
 assert.equal(await screen({group:'personal',login:'1'}),'keepsake-login');
 assert.equal(await screen({group:'personal',browse:'1'}),'workspace');
 for(const action of ['quick','studio'])await assert.rejects(screen({group:'personal',[action]:'1'}),/redirect:\/make\?lang=ko&stage=create/);
 await assert.rejects(screen({group:'personal',album:'album-id',view:'photos'}),/redirect:\/library\?lang=ko&album=album-id/);
});
test('English and Korean group links use the same book home',async()=>{
 assert.equal(await screen({lang:'en',group:'personal'}),'keepsake-workspace');
 assert.equal(await screen({lang:'ko',home:'1',group:'personal'}),'keepsake-workspace');
});

test('new web visitors see the card introduction while returning visitors open their collection',async()=>{
 assert.equal(await screen({}),'memory-intro');
 assert.equal(await screen({lang:'ko'}),'memory-intro');
 assert.equal(await screen({lang:'en'}),'memory-intro');
 assert.equal(await screen({lang:'ko'},false,true),'keepsake-workspace');
 assert.equal(await screen({lang:'en'},false,true),'keepsake-workspace');
 assert.equal(await screen({lang:'ko'},true),'workspace');
});

test('first-visit routing preserves sign-in, creation, albums and invitations',async()=>{
 for(const params of [{login:'1'},{loginError:'cancelled'}])assert.equal(await screen(params),'keepsake-login');
 assert.equal(await screen({browse:'1'}),'workspace');
 assert.equal(await screen({album:'album-id',legacy:'1'}),'workspace');
 await assert.rejects(screen({quick:'1'}),/redirect:\/make/);
 await assert.rejects(screen({album:'album-id'}),/redirect:\/library/);
 const token='a'.repeat(64);
 await assert.rejects(screen({invite:token}),new RegExp('redirect:/join/'+token));
});
