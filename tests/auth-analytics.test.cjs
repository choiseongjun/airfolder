const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('lib/auth-analytics.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness({consent='granted',dnt,hostname='memonestia.xyz',search='',configured=true}={}){
 const calls=[];const exports={};let choice=consent;
 const sdk={isSupported:async()=>true,setConsent:c=>calls.push(['consent',c]),initializeAnalytics:(_,c)=>(calls.push(['init',c]),{}),logEvent:(_,e,p)=>calls.push(['event',e,p]),setAnalyticsCollectionEnabled:(_,v)=>calls.push(['enabled',v])};
 vm.runInNewContext(code,{exports,process:{env:{NODE_ENV:'production',NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:configured?'G-TEST':undefined}},window:{},location:{hostname,search,origin:'https://'+hostname},navigator:{doNotTrack:dnt},localStorage:{getItem:()=>choice,setItem:(_,v)=>choice=v},URLSearchParams,require:n=>n==='./firebase-client'?{firebaseApp:()=>({})}:n==='./acquisition'?{captureAttribution:()=>({campaign_source:'threads',campaign_medium:'social',campaign_name:'birthday'})}:n==='./growth-client'?{trackClient:async()=>{}}:sdk});
 return {api:exports,calls};
}
test('no Firebase Analytics initialization before consent, on opt-out, in browse or outside production origin',async()=>{
 for(const opts of [{consent:null},{consent:'denied'},{dnt:'1'},{hostname:'localhost'},{search:'?browse=1'},{configured:false}]){const h=harness(opts);await h.api.trackAuthEvent('login','google','web');assert.equal(h.calls.length,0);}
});
test('provider and surface remain measurable while private URL and raw errors are excluded',async()=>{
 const h=harness({search:'?token=secret&album=private'});await h.api.trackAuthEvent('login_failed','apple','app_connect',{code:'auth/network-request-failed',message:'private@example.com secret'});
 const event=h.calls.find(c=>c[0]==='event');assert.equal(event[1],'login_failed');assert.equal(event[2].method,'apple');assert.equal(event[2].campaign_name,'birthday');assert.equal(event[2].surface,'app_connect');assert.equal(event[2].reason,'network');assert.equal(event[2].page_location,'https://memonestia.xyz/');assert.ok(!JSON.stringify(h.calls).includes('secret'));assert.equal(h.calls.find(c=>c[0]==='init')[1].config.send_page_view,false);
});
test('revoking consent stops subsequent login events',async()=>{const h=harness();await h.api.trackAuthEvent('login','google','web');await h.api.setAnalyticsPreference(false);await h.api.trackAuthEvent('login','apple','web');assert.equal(h.calls.filter(c=>c[0]==='event').length,1);assert.ok(h.calls.some(c=>c[0]==='enabled'&&c[1]===false));});
