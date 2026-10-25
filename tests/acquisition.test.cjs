const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file, imports={}, globals={}) {
 const loaded={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:loaded,exports:loaded.exports,require:n=>{assert.ok(n in imports,n);return imports[n]},...globals});
 return loaded.exports;
}
const a=load('lib/acquisition.ts');
const journey='12345678-1234-4234-8234-123456789abc';
test('attribution survives OAuth cookie encoding and rejects expired or malformed identifiers',()=>{
 const value={journey_id:journey,acquired_at:Date.now(),campaign_source:'threads',campaign_medium:'social',campaign_name:'birthday'};
 const encoded=encodeURIComponent(JSON.stringify(value));
 assert.equal(a.attributionFromCookie(`other=1; memonestia_attribution=${encoded}`).campaign_name,'birthday');
 assert.equal(a.parseAttribution(encoded,value.acquired_at+31*86400000),null);
 assert.equal(a.parseAttribution(encoded,value.acquired_at-200).acquired_at,value.acquired_at-200);
 assert.equal(a.parseAttribution(encoded,value.acquired_at-600000),null);
 assert.equal(a.parseAttribution(encodeURIComponent(JSON.stringify({...value,journey_id:'email@example.com'}))),null);
 assert.equal(a.parseAttribution(encodeURIComponent(JSON.stringify({...value,campaign_name:'https://private/link?email=x'}))).campaign_name,'none');
});
test('first-touch persists across a second campaign and DNT disables browser tracking',()=>{
 const document={cookie:'',referrer:'https://www.threads.com/'};
 const globals={window:{},document,navigator:{},location:{search:'?utm_source=threads&utm_campaign=birthday',protocol:'https:'},URL,URLSearchParams,crypto:{randomUUID:()=>journey}};
 const browser=load('lib/acquisition.ts',{},globals);
 assert.equal(browser.captureAttribution().campaign_name,'birthday');
 globals.location.search='?utm_source=other&utm_campaign=travel';
 assert.equal(browser.captureAttribution().campaign_name,'birthday');
 globals.navigator.doNotTrack='1';
 assert.equal(browser.captureAttribution(),null);
});
test('successful Kakao callback records verified login and only new accounts sign up',async()=>{
 for(const fresh of [false,true]) {
  const recorded=[],set=[];
  const jar={get:name=>name==='memonestia_kakao_state'?{value:JSON.stringify({state:'state',returnTo:'/'})}:undefined,set:(...args)=>set.push(args)};
  const route=load('app/api/auth/kakao/callback/route.ts',{
   'node:crypto':require('node:crypto'),'next/headers':{cookies:async()=>jar},
   '@/lib/server':{ApiError:class extends Error{},ensureSession:async()=>'guest',hash:s=>s,transaction:async cb=>cb({query:async()=>({rowCount:0})})},
   '@/lib/auth-core':{attachIdentity:async(db,guest,identity,created)=>{if(fresh)created();return 'owner'}},
   '@/lib/kakao-auth':{KAKAO_STATE_COOKIE:'memonestia_kakao_state',safeReturnPath:()=> '/',kakaoIdentity:async()=>({uid:'verified'})},
   '@/lib/growth':{trackGrowth:e=>recorded.push(e)}
  },{URL,Response,Buffer,console});
  const response=await route.GET(new Request('https://example.test/api/auth/kakao/callback?code=code&state=state'));
  assert.equal(response.status,303);
  assert.deepEqual(recorded.map(e=>e.event),fresh?['login','sign_up']:['login']);
  assert.ok(recorded.every(e=>e.who==='owner'&&e.properties.method==='kakao'));
  assert.ok(set.some(([name,value])=>name==='memonestia_auth_result'&&value===(fresh?'signup':'login')));
 }
});
test('unverified Kakao callback never emits a successful login',async()=>{
 const route=load('app/api/auth/kakao/callback/route.ts',{
  'node:crypto':require('node:crypto'),'next/headers':{cookies:async()=>({get:()=>undefined,set:()=>{}})},
  '@/lib/server':{},'@/lib/auth-core':{},'@/lib/kakao-auth':{KAKAO_STATE_COOKIE:'state',safeReturnPath:()=> '/'},
  '@/lib/growth':{trackGrowth:()=>assert.fail('false login')}
 },{URL,Response,Buffer});
 assert.match((await route.GET(new Request('https://example.test/api/auth/kakao/callback?code=forged&state=x'))).headers.get('location'),/LOGIN_STATE_FAILED/);
});
