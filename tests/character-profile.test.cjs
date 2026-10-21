const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
function route({enabled=true,row={active:null,draft:null,attempts:0},who='me'}={}){
 const queries=[];class ApiError extends Error{constructor(status,code){super(code);this.status=status}}
 const db={query:async(sql,args)=>{queries.push({sql,args});return {rows:[row],rowCount:row?1:0}}};
 const loaded={exports:{}};const imports={'sharp':()=>{throw Error('Must not decode')},'node:crypto':require('node:crypto'),'@/lib/safety':{requireTerms:async()=>{}},'@/lib/server':{ApiError,pool:()=>db,viewer:async()=>who,sameOrigin:r=>{if(r.headers.get('origin')!=='https://app.test')throw new ApiError(403,'INVALID_ORIGIN')},transaction:fn=>fn(db),safe:async fn=>{try{return await fn()}catch(e){return Response.json({error:e.message},{status:e.status||500})}}}};
 process.env.CHARACTER_PROFILE_ENABLED=enabled?'1':'0';
 imports['@/lib/character-style']={characterPrompt:()=> 'Test portrait prompt'};
 const code=ts.transpileModule(fs.readFileSync('app/api/character-profile/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(n=>imports[n],loaded,loaded.exports);return {...loaded.exports,queries};
}
const request=(method,headers={},body)=>new Request('https://app.test/api/character-profile',{method,headers:{origin:'https://app.test',...headers},body});
test('test quota is configurable but bounded and remaining never goes negative',async()=>{
 const previous=process.env.CHARACTER_PROFILE_DAILY_LIMIT;
 try{
  for(const [setting,limit,remaining] of [['10',10,7],['3',3,0],['100',3,0],['bad',3,0]]){
   process.env.CHARACTER_PROFILE_DAILY_LIMIT=setting;
   const body=await (await route({row:{attempts:3}}).GET()).json();
   assert.equal(body.dailyLimit,limit);assert.equal(body.remaining,remaining);
  }
 }finally{if(previous===undefined)delete process.env.CHARACTER_PROFILE_DAILY_LIMIT;else process.env.CHARACTER_PROFILE_DAILY_LIMIT=previous;}
});
test('experiment disabled means no profile reads or writes',async()=>{const r=route({enabled:false});assert.equal((await r.GET()).status,404);assert.equal(r.queries.length,0)});
test('profile results are viewer scoped and uncacheable',async()=>{const r=route({row:{active:Buffer.from('test'),draft:null,attempts:2}});const res=await r.GET();const b=await res.json();assert.equal(b.remaining,1);assert.match(b.active,/^data:image\/webp;base64,/);assert.match(res.headers.get('cache-control'),/no-store/);assert.deepEqual(r.queries[0].args,['me'])});
test('photo consent is required before any generation or quota writes',async()=>{const r=route();assert.equal((await r.POST(request('POST',{'content-type':'image/jpeg'},'x'))).status,400);assert.equal(r.queries.length,0)});
test('cross-origin apply is rejected without touching profile',async()=>{const r=route();assert.equal((await r.PATCH(request('PATCH',{origin:'https://other.test'}))).status,403);assert.equal(r.queries.length,0)});
test('applying an expired or missing draft leaves active profile unchanged',async()=>{const r=route({row:null});assert.equal((await r.PATCH(request('PATCH'))).status,409);assert.match(r.queries[0].sql,/draft_at>now\(\)-interval '24 hours'/);assert.deepEqual(r.queries[0].args,['me'])});
