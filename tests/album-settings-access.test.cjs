const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
class ApiError extends Error{constructor(status,code){super(code);this.status=status;}}
const folder='10000000-0000-4000-8000-000000000001';
function route(member){let calls=0;const db={query:async()=>{calls++;return calls===1?{rows:[{can_edit:true,can_invite:true,description:'Trip',theme:'ticket',song:'Together',reveal_at:new Date('2026-12-01T00:00:00Z'),end_date:'2026-12-01',held:2,held_people:1}]}:{rows:[]}}};
const server={ApiError,viewer:async()=>'viewer',uuid:x=>x,requireMember:async()=>{if(!member)throw new ApiError(404,'FOLDER_NOT_FOUND')},pool:()=>db,safe:async f=>{try{return await f()}catch(e){return Response.json({error:e.message},{status:e.status||500})}}};
const loaded={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync('app/api/members/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>name==='next/server'?{connection:async()=>{}}:server,loaded,loaded.exports);return{...loaded.exports,calls:()=>calls};}
test('album members receive saved theme, birthday and capsule settings without losing their values',async()=>{
 const r=route(true),response=await r.GET(new Request('https://qa.invalid/api/members?folderId='+folder)),data=await response.json();
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/private, no-store/);
 assert.deepEqual(data.album,{description:'Trip',endDate:'2026-12-01',style:{theme:'ticket',song:'Together',revealAt:'2026-12-01T00:00:00.000Z',held:2,heldPeople:1}});
});
test('nonmembers cannot read album settings or membership data',async()=>{
 const r=route(false);assert.equal((await r.GET(new Request('https://qa.invalid/api/members?folderId='+folder))).status,404);assert.equal(r.calls(),0);
});
