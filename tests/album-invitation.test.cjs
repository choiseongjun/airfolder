const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(file,imports){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(name=>{if(name in imports)return imports[name];throw new Error(name);},module,module.exports);return module.exports;}
function route(row){const writes=[];class ApiError extends Error{constructor(status,code){super(code);this.status=status;}}const mod=load('app/api/invites/route.ts',{
 'node:crypto':require('node:crypto'), '@/lib/growth':{trackGrowth(){}},'@/lib/safety':{requireTerms:async()=>{}},
 '@/lib/server':{ApiError,viewer:async()=> 'viewer',sameOrigin(){},uuid:v=>v,hash:v=>v,json:r=>r.json(),pool:()=>({query:async(sql,args)=>{if(sql.startsWith('SELECT')){assert.match(sql,/COALESCE\(g.owner_id,f.owner_id\)=\$2/);assert.match(sql,/deleted_at IS NULL/);return {rowCount:row?1:0,rows:row?[row]:[]};}writes.push({sql,args});return {};}}),safe:async fn=>{try{return await fn();}catch(e){return Response.json({error:e.message},{status:e.status||500});}}}
 });return {...mod,writes};}
const request=()=>new Request('https://example.test/api/invites',{method:'POST',body:JSON.stringify({folderId:'album'})});
test('crew album invitation creates a crew token without revoking outstanding invitations',async()=>{const r=route({id:'album',group_id:'crew'});const res=await r.POST(request());assert.equal(res.status,200);const body=await res.json();assert.equal(body.kind,'group');assert.equal(body.groupId,'crew');assert.match(body.token,/^[a-f0-9]{64}$/);assert.equal(r.writes.length,1);assert.match(r.writes[0].sql,/INSERT INTO snaproom.group_invites/);assert.equal(r.writes[0].args[1],'crew');});
test('personal album invitation stays scoped to the album',async()=>{const r=route({id:'album',group_id:null});const res=await r.POST(request());assert.equal(res.status,200);assert.equal((await res.json()).kind,'album');assert.match(r.writes[0].sql,/INSERT INTO snaproom.invites/);});
test('non-owner or missing album cannot mint invitations',async()=>{const r=route(null);assert.equal((await r.POST(request())).status,403);assert.equal(r.writes.length,0);});
const {joinedAlbumHref}=load('lib/album-navigation.ts',{});
test('Korean invitation destinations preserve crew, album and rolling paper in the new drawer',()=>{assert.equal(joinedAlbumHref('ko','album','crew'),'/crew/photos?group=crew&album=album');assert.equal(joinedAlbumHref('ko','album'),'/crew/photos?group=personal&album=album');assert.equal(joinedAlbumHref('ko',undefined,'crew'),'/crew/photos?group=crew');assert.equal(joinedAlbumHref('ko','album','crew','rolling'),'/crew/photos?group=crew&album=album&view=rolling');assert.equal(joinedAlbumHref('en','album'), '/?lang=en&album=album&view=theme');});
