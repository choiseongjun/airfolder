const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(file,imports){const loaded ={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(name=>{if(name in imports)return imports[name];throw new Error(name);},loaded,loaded.exports);return loaded.exports;}
function route(row){const writes=[];class ApiError extends Error{constructor(status,code){super(code);this.status=status;}}const mod=load('app/api/invites/route.ts',{
 'node:crypto':require('node:crypto'), '@/lib/growth':{trackGrowth(){}},'@/lib/safety':{requireTerms:async()=>{}},
 '@/lib/server':{ApiError,viewer:async()=> 'viewer',sameOrigin(){},uuid:v=>v,hash:v=>v,json:r=>r.json(),pool:()=>({query:async(sql,args)=>{if(sql.startsWith('SELECT')){assert.match(sql,/COALESCE\(g.owner_id,f.owner_id\)=\$2/);assert.match(sql,/deleted_at IS NULL/);return {rowCount:row?1:0,rows:row?[row]:[]};}writes.push({sql,args});return {};}}),safe:async fn=>{try{return await fn();}catch(e){return Response.json({error:e.message},{status:e.status||500});}}}
 });return {...mod,writes};}
const request=()=>new Request('https://example.test/api/invites',{method:'POST',body:JSON.stringify({folderId:'album'})});
test('crew album invitation creates a crew token without revoking outstanding invitations',async()=>{const r=route({id:'album',group_id:'crew'});const res=await r.POST(request());assert.equal(res.status,200);const body=await res.json();assert.equal(body.kind,'group');assert.equal(body.groupId,'crew');assert.match(body.token,/^[a-f0-9]{64}$/);assert.equal(r.writes.length,1);assert.match(r.writes[0].sql,/INSERT INTO snaproom.group_invites/);assert.equal(r.writes[0].args[1],'crew');});
test('personal album invitation stays scoped to the album',async()=>{const r=route({id:'album',group_id:null});const res=await r.POST(request());assert.equal(res.status,200);assert.equal((await res.json()).kind,'album');assert.match(r.writes[0].sql,/INSERT INTO snaproom.invites/);});
test('non-owner or missing album cannot mint invitations',async()=>{const r=route(null);assert.equal((await r.POST(request())).status,403);assert.equal(r.writes.length,0);});
const {joinedAlbumHref}=load('lib/album-navigation.ts',{});
const {inviteRequest,requestInviteLink,inviteRequestMessage}=load('lib/invite-request.ts',{});
test('request links preserve the target album and route birthday guests to notes',()=>{
 const base='https://example.test/join/token?lang=ko&album=target';
 const birthday=new URL(requestInviteLink(base,'birthday'));
 assert.equal(birthday.searchParams.get('album'),'target');
 assert.equal(birthday.searchParams.get('next'),'rolling');
 assert.equal(birthday.searchParams.get('request'),'birthday');
 const photos=new URL(requestInviteLink(birthday.toString(),'photos'));
 assert.equal(photos.searchParams.get('next'),null);
 assert.equal(photos.searchParams.get('request'),'photos');
 assert.equal(inviteRequest('untrusted'),'photos');
 assert.match(inviteRequestMessage('여행',photos.toString(),'photos',true),/내가 나온 사진/);
 assert.match(inviteRequestMessage('생일',birthday.toString(),'birthday',true),/사진이 없어도/);
});
test('Korean invitation destinations preserve crew, album and rolling paper in the new drawer',()=>{assert.equal(joinedAlbumHref('ko','album','crew'),'/crew/photos?lang=ko&group=crew&album=album');assert.equal(joinedAlbumHref('ko','album'),'/crew/photos?lang=ko&group=personal&album=album');assert.equal(joinedAlbumHref('ko',undefined,'crew'),'/crew/photos?lang=ko&group=crew');assert.equal(joinedAlbumHref('ko','album','crew','rolling'),'/crew/photos?lang=ko&group=crew&album=album&view=rolling');assert.equal(joinedAlbumHref('en','album'), '/crew/photos?lang=en&group=personal&album=album');});
