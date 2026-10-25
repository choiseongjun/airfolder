const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(file,imports){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>imports[n],mod,mod.exports);return mod.exports;}
class ApiError extends Error{constructor(status,code){super(code);this.status=status;}}
const id='10000000-0000-4000-8000-000000000001',folder='10000000-0000-4000-8000-000000000002',recipient='10000000-0000-4000-8000-000000000003';
function route(){const stored=[];const db={query:async(sql,args)=>{if(sql.startsWith('INSERT INTO snaproom.upload_sessions'))stored.push(args[4]);if(sql.includes('SELECT viewer_id FROM snaproom.members'))return{rowCount:args[1].every(x=>x===recipient)?args[1].length:0,rows:[]};if(sql.includes('COALESCE(sum(size_bytes)'))return{rows:[{total:0,own:0}],rowCount:1};return{rows:[],rowCount:0};}};
const server={ApiError,uuid:x=>{if(!/^[-a-f0-9]{36}$/.test(x))throw new ApiError(400,'INVALID_ID');return x},viewer:async()=>'qa',sameOrigin:()=>{},requireMember:async()=>{},json:r=>r.json(),transaction:f=>f(db),safe:async f=>{try{return await f()}catch(e){return Response.json({error:e.message},{status:e.status||500})}}};
return{...load('app/api/photos/uploads/route.ts',{'@/lib/server':server,'@/lib/media-limits':{mediaLimit:()=>20*1024**2},'@/lib/safety':{requireActiveViewer:async()=>{}},'@/lib/growth':{trackGrowth:()=>{}},'@/lib/audience':load('lib/audience.ts',{'./server':server})}),stored};}
const request=body=>new Request('https://qa.invalid/api/photos/uploads',{method:'POST',body:JSON.stringify({id,folderId:folder,size:10,created:Date.now(),mime:'image/jpeg',...body})});
test('chunk staging keeps selected recipients for final upload, including web JSON string metadata',async()=>{
 for(const recipients of [[recipient],JSON.stringify([recipient])]){const r=route();assert.equal((await r.POST(request({shared:true,recipients}))).status,200);assert.deepEqual(JSON.parse(r.stored[0].recipients),[recipient]);assert.equal(r.stored[0].shared,'true');}
});
test('staging refuses malformed, nonmember and private recipient lists before storing anything',async()=>{
 for(const body of [{shared:true,recipients:'oops'},{shared:true,recipients:[id]},{shared:false,recipients:[recipient]}]){const r=route();assert.equal((await r.POST(request(body))).status,400);assert.equal(r.stored.length,0);}
});
test('public-to-album and private uploads retain their audience',async()=>{
 for(const shared of [false,true]){const r=route();assert.equal((await r.POST(request({shared}))).status,200);assert.deepEqual(JSON.parse(r.stored[0].recipients),[]);assert.equal(r.stored[0].shared,String(shared));}
});
