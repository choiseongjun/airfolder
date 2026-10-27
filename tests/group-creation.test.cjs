const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const id='3e06779b-060b-4d10-9735-9536a1013b07';
function route(existing){
 const exports={},writes=[];
 class ApiError extends Error{constructor(status,message){super(message);this.status=status}}
 const db={query:async(sql,args)=>{if(sql.includes('SELECT owner_id'))return {rowCount:existing?1:0,rows:existing?[{owner_id:existing}]:[]};if(sql.includes('count(*)'))return {rows:[{n:0}]};if(sql.startsWith('INSERT'))writes.push({sql,args});return {rows:[]}}};
 const server={ApiError,sameOrigin(){},viewer:async()=>'owner',json:r=>r.json(),uuid:v=>{if(!/^[a-f0-9-]{36}$/.test(v))throw new ApiError(400,'INVALID_ID');return v},transaction:fn=>fn(db),safe:async fn=>{try{return await fn()}catch(e){return Response.json({error:e.message},{status:e.status||500})}}};
 const code=ts.transpileModule(fs.readFileSync('app/api/groups/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,Response,require:n=>n==='@/lib/server'?server:n==='@/lib/safety'?{requireTerms:async()=>{}}:n==='@/lib/memories'?{textBody:v=>v}:n==='node:crypto'?require(n):{}});
 return {writes,post:body=>exports.POST(new Request('http://localhost/api/groups',{method:'POST',body:JSON.stringify(body)}))};
}
test('new shelf creation uses stable identity and creates owner membership',async()=>{const r=route();const response=await r.post({creationId:id,name:'Our shelf'});assert.equal(response.status,201);assert.equal((await response.json()).id,id);assert.equal(r.writes.length,2);assert.equal(r.writes[0].args[0],id);assert.equal(r.writes[0].args[4],false)});
test('retry returns the owned shelf without inserting duplicates',async()=>{const r=route('owner');assert.equal((await r.post({creationId:id,name:'Our shelf'})).status,201);assert.equal(r.writes.length,0)});
test('another owner cannot claim an existing shelf ID',async()=>{const r=route('someone-else');assert.equal((await r.post({creationId:id,name:'Our shelf'})).status,409);assert.equal(r.writes.length,0)});
test('malformed creation identity is rejected before insertion',async()=>{const r=route();assert.equal((await r.post({creationId:'bad',name:'Our shelf'})).status,400);assert.equal(r.writes.length,0)});
