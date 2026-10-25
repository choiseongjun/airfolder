const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(file,imports={}){const loaded={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>imports[name],loaded,loaded.exports);return loaded.exports;}
const story=load('lib/trip-story.ts',{'./character-style':{characterAnimals:[{id:'cat'}]}});
const input={title:'Trip',name:'Guest',body:'Our real memory',animal:'cat',useProfile:false,files:[1,2].map(n=>({id:'photo'+n,file:new File(['data'],'photo.jpg',{type:'image/jpeg'}),src:'blob:local'})),attemptId:'attempt'};
test('trip story retries preserve completed photos, album and note before creating an invite',async()=>{
 const state={creationId:'album-key',noteId:'note-key',uploaded:new Set()},calls=[];let fail='photo2';
 const api=async(url,options)=>{const body=options.body;calls.push({url,body:body instanceof FormData?Object.fromEntries(body):JSON.parse(body)});if(url==='/api/folders')return{id:'album'};if(url==='/api/photos'&&body.get('id')===fail){fail='invite';throw Error('NETWORK');}if(url==='/api/invites'&&fail==='invite'){fail='';throw Error('NETWORK');}return{token:'token'};};
 await assert.rejects(story.saveStory(api,state,input,true));assert.equal(state.folderId,'album');assert.deepEqual([...state.uploaded],['photo1']);
 await assert.rejects(story.saveStory(api,state,input,true));assert.equal(state.saved,true);
 assert.deepEqual(await story.saveStory(api,state,input,true),{folderId:'album',token:'token'});
 assert.equal(calls.filter(c=>c.url==='/api/folders').length,1);assert.equal(calls.filter(c=>c.url==='/api/trip-story').length,1);assert.equal(calls.filter(c=>c.url==='/api/photos'&&c.body.id==='photo1').length,1);
 const note=calls.find(c=>c.url==='/api/trip-story').body;assert.deepEqual(note.photoIds,['photo1','photo2']);assert.equal(note.id,'note-key');assert.equal(note.body,input.body);
});
test('guest contribution never creates a new album or requests an owner invite',async()=>{
 const state={folderId:'joined-album',creationId:'unused',noteId:'guest-note',uploaded:new Set()},urls=[];
 await story.saveStory(async(url)=>{urls.push(url);return{}},state,input,false);assert.deepEqual(urls,['/api/photos','/api/photos','/api/trip-story']);
});
test('story analytics excludes words, photos and characters and keeps completion server-owned',()=>{
 const events=load('lib/growth-events.ts');const properties=events.growthProperties({flow:'trip_story',body:'private note',name:'private name',avatar:'secret',photo_count:3});assert.deepEqual(properties,{photo_count:3,flow:'trip_story'});
 for(const event of ['trip_story_saved','trip_story_contributed'])assert.ok(!events.clientEvents.includes(event));
});
