const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
async function route(screen,params){
 const code=ts.transpileModule(fs.readFileSync(`app/(workspace)/crew/${screen}/page.tsx`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};vm.runInNewContext(code,{exports,URLSearchParams,require(name){
  if(name==='react'||name==='react/jsx-runtime')return require(name);
  if(name==='@/lib/request-locale')return {requestLocale:async lang=>lang==='en'?'en':'ko'};
  if(name==='@/app/crew-route')return {default:'legacy-crew'};
  if(name==='next/navigation')return {redirect:url=>{throw new Error(url)}};
  throw Error(name);
 }});
 const wrapper=exports.default({searchParams:Promise.resolve(params)});
 return wrapper.props.children.type(wrapper.props.children.props);
}
test('old navigation reaches the new collection, gifts and account in both languages',async()=>{
 for(const [old,current] of [['photos','library'],['behind','gifts'],['settings','account']])for(const lang of ['ko','en']){
  await assert.rejects(route(old,{lang}),e=>e.message===`/${current}?lang=${lang}`);
 }
});
test('existing album and group context survive collection migration',async()=>{
 await assert.rejects(route('photos',{lang:'en',album:'book-id',group:'family space'}),e=>{const url=new URL(e.message,'https://example.test');assert.equal(url.pathname,'/library');assert.equal(url.searchParams.get('album'),'book-id');assert.equal(url.searchParams.get('group'),'family space');assert.equal(url.searchParams.get('lang'),'en');return true;});
});
test('explicit source management remains reachable without a redirect loop',async()=>{
 for(const screen of ['photos','behind','settings']){const result=await route(screen,{legacy:'1',lang:'en'});assert.equal(result.type,'legacy-crew');assert.equal(result.props.screen,screen);assert.equal(result.props.locale,'en');}
});
