const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(path,imports={}) {const loaded={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:loaded,exports:loaded.exports,require:n=>{assert.ok(n in imports,n);return imports[n];}});return loaded.exports;}
const request=load('lib/photo-request.ts');
test('photo requests resume each failed stage without creating a second album',async()=>{
 for(const failedStage of [0,1,2]) {
  const state={creationId:'stable-id',name:'Our trip'},calls=[];let failed=false,albumExists=false,created=0;
  const api=async(url,options)=>{
   const body=JSON.parse(options.body),stage=url==='/api/invites'?2:options.method==='PUT'?1:0;calls.push({stage,body});
   if(stage===0){assert.equal(body.creationId,'stable-id');assert.equal(body.attempt_id,'attempt');assert.equal(body.flow,'photo_request');if(!albumExists){created++;albumExists=true;}}
   if(stage===failedStage&&!failed){failed=true;throw new Error('response lost');}
   return stage===0?{id:'album'}:stage===2?{token:'token'}:{};
  };
  await assert.rejects(request.createPhotoRequest(api,state,'attempt'));
  assert.deepEqual(JSON.parse(JSON.stringify(await request.createPhotoRequest(api,state,'attempt'))),{folderId:'album',token:'token'});
  assert.equal(created,1);
  const previous=calls.length;await request.createPhotoRequest(api,state,'attempt');assert.equal(calls.length,previous);
  if(failedStage>0)assert.equal(calls.filter(c=>c.stage===0).length,1);
  if(failedStage===2)assert.equal(calls.filter(c=>c.stage===1).length,1);
 }
});
test('request creation never uploads photos or changes photo visibility',async()=>{
 const state={creationId:'id',name:'Our trip'},routes=[];
 await request.createPhotoRequest(async(url,options)=>{routes.push(`${options.method} ${url}`);return url==='/api/invites'?{token:'token'}:{id:'album'};},state,'attempt');
 assert.deepEqual(routes,['POST /api/folders','PUT /api/folders','POST /api/invites']);
});
test('only travel acquisition uses collection; explicit decorating and other categories remain direct',()=>{
 const campaigns=load('lib/album-campaigns.ts',{'./memory-templates':{memoryTemplate:id=>({id,albumTheme:id?.replace('album-','')})}});
 assert.equal(campaigns.isPhotoRequestEntry(null,null),true);
 assert.equal(campaigns.isPhotoRequestEntry('album-ticket','travel'),true);
 for(const args of [[null,'couple'],['album-diary','family'],[null,null,true],['album-ticket','travel',false,'decorate']])assert.equal(campaigns.isPhotoRequestEntry(...args),false);
 assert.deepEqual(JSON.parse(JSON.stringify(campaigns.makerTemplate(null,'couple').photos)),['jeju-couple']);
});
test('request events keep coarse attribution and never expose messages or invitation tokens',()=>{
 const events=load('lib/growth-events.ts');
 const props=events.growthProperties({flow:'photo_request',attempt_id:'12345678-1234-4234-8234-123456789abc',name:'Private trip',message:'Private message',token:'secret'});
 assert.deepEqual(JSON.parse(JSON.stringify(props)),{attempt_id:'12345678-1234-4234-8234-123456789abc',flow:'photo_request'});
 assert.equal(events.growthProperties({flow:'private trip'}).flow,undefined);
 for(const e of ['album_created','invite_created','invite_opened','invite_joined','upload_succeeded'])assert.equal(events.clientEvents.includes(e),false);
});
