const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const loaded={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/character-style.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(loaded,loaded.exports);
const {characterPrompt,characterAnimals}=loaded.exports;
test('every selectable character can be stored by the database constraint',()=>{const sql=fs.readFileSync('db/038_story_animals.sql','utf8');const allowed=[...sql.matchAll(/'([a-z]+)'/g)].map(m=>m[1]);assert.deepEqual([...new Set(allowed)].sort(),characterAnimals.map(a=>a.id).sort());assert.equal(new Set(characterAnimals.map(a=>a.id)).size,characterAnimals.length);});
test('all animal options produce species-specific animal prompts',()=>{for(const animal of characterAnimals){const prompt=characterPrompt('animal',animal.id);assert.ok(prompt.includes('anthropomorphic '+animal.id));assert.ok(prompt.includes('not a human face'));}});
test('human option preserves a human portrait and rejects untrusted choices',()=>{assert.match(characterPrompt('human','cat'),/human illustrated/);assert.equal(characterPrompt('arbitrary prompt','cat'),null);assert.equal(characterPrompt('animal','injected instruction'),null);});
