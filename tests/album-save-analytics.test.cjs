const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const attempt='12345678-1234-4234-8234-123456789abc';
function load(file,imports,globals={}){const c={exports:{},require:n=>imports[n],...globals};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,c);return c.exports;}
const properties=load('lib/growth-events.ts',{});
test('completion requires persisted photos in the matching theme, and preserves membership at completion',async()=>{
 for(const row of [undefined,{theme:'ticket',photo_count:0},{theme:'diary',photo_count:2},{theme:'ticket',photo_count:2,member:false},{theme:'ticket',photo_count:2,member:true}]){
  const queued=[],events=[];
  const a=load('lib/album-save-analytics.ts',{'server-only':{},'next/server':{after:f=>queued.push(f)},'./server':{pool:()=>({query:async()=>({rows:row?[row]:[]})})},'./growth':{trackGrowth:e=>events.push(e)},'./growth-events':properties,'./memory-templates':{memoryTemplate:id=>id==='album-ticket'?{id,albumTheme:'ticket'}:undefined}},{console});
  a.trackAlbumSaved('viewer','record','folder',{attempt_id:attempt,template_id:'album-ticket',photo_count:30,creator_type:'forged'});
  await queued[0]();const ok=row?.theme==='ticket'&&row.photo_count>0;assert.equal(events.length,ok?1:0);
  if(ok){assert.equal(events[0].event,'album_save_completed');assert.equal(events[0].key,'maker-saved:record');assert.equal(events[0].properties.photo_count,2);assert.equal(events[0].properties.creator_type,row.member?'member':'guest');}
 }
});
test('missing metadata and non-album templates do not manufacture a completion',()=>{
 const a=load('lib/album-save-analytics.ts',{'server-only':{},'next/server':{after:()=>assert.fail('must not schedule')},'./server':{},'./growth':{},'./growth-events':properties,'./memory-templates':{memoryTemplate:()=>undefined}});
 for(const value of [undefined,null,{},'private',{attempt_id:'email@example.com',template_id:'album-ticket'}])a.trackAlbumSaved('v','r','f',value);
});
