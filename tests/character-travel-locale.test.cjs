const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function load(file){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>load(path.resolve(path.dirname(file),name+'.ts')),m,m.exports);return m.exports;}
const {crewText}=load('lib/crew-copy.ts'),{characterTravelEnglish}=load('lib/character-travel-copy.ts'),{characterAnimals,mascotName}=load('lib/character-style.ts'),{characterScene}=load('lib/character-scene.ts'),{REWARDS,REWARD_KINDS,growthStage}=load('lib/piece-rewards.ts'),{storyInvite}=load('lib/trip-story.ts');
test('all 30 animals, scenes, 24 rewards and growth stages have English copy',()=>{
 const labels=[...characterAnimals.flatMap(a=>[a.label,mascotName(a.id),characterScene(a.id).label]),...REWARDS.flatMap(r=>[r.name,r.description]),...Object.values(REWARD_KINDS),...[0,5,25,100].map(n=>growthStage(n).label)];
 for(const label of labels){assert.notEqual(crewText('en',label),label,label);assert.doesNotMatch(crewText('en',label),/[가-힣]/);assert.equal(crewText('ko',label),label);}
});
test('translated templates preserve member names and interpolate counts without altering content',()=>{
 const name='지우 {1} <friend>';assert.equal(crewText('en','{0}의 기억',name),name+'’s memory');assert.equal(crewText('ko','{0}의 기억',name),name+'의 기억');
 assert.equal(crewText('en','누적 {0}조각',25),'25 pieces collected');
 for(const [key,value]of Object.entries(characterTravelEnglish)){assert.doesNotMatch(value,/[가-힣]/);assert.deepEqual((key.match(/\{\d+\}/g)||[]).sort(),(value.match(/\{\d+\}/g)||[]).sort(),key);}
});
test('trip invitations translate product copy and retain the exact title and link',()=>{
 const title='부산의 기억',link='https://example.test/join/token?lang=en&request=story';const en=storyInvite(title,link,'en');assert(en.startsWith(title));assert(en.endsWith(link));assert.doesNotMatch(en.replace(title,''),/[가-힣]/);assert.match(storyInvite(title,link),/회원가입/);
});

test('album decoration sticker names and captions are fully bilingual',()=>{
const {STUDIO_STICKERS,STUDIO_STICKER_COPY}=load('lib/reward-decoration.ts');
for(const label of [...STUDIO_STICKERS.map(s=>s.name),...Object.values(STUDIO_STICKER_COPY).flatMap(s=>[s.title,s.caption])]){assert.doesNotMatch(crewText('en',label),/[가-힣ㄱ-ㅎ]/);assert.equal(crewText('ko',label),label);}
});
