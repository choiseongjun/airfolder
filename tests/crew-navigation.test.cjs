const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript');
function load(path){const module={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(module,module.exports);return module.exports;}
const {crewHref,crewTabs}=load('lib/crew-navigation.ts');
const {translate,english}=load('app/i18n.ts');
test('both languages retain the same destinations and selected crew',()=>{
 for(const tab of crewTabs.filter(tab=>tab.key!=='create')){
  const ko=new URL(crewHref(tab.key,'ko','crew & friends'), 'https://example.test');
  const en=new URL(crewHref(tab.key,'en','crew & friends'), 'https://example.test');
  assert.equal(ko.pathname,en.pathname);
  assert.equal(en.searchParams.get('group'),'crew & friends');
  assert.equal(en.searchParams.get('lang'),'en');
  ko.searchParams.delete('lang');en.searchParams.delete('lang');
  assert.equal(ko.href,en.href);
  assert.doesNotMatch(tab.en,/[가-힣]/);
 }
});
test('album terminology uses correct articles without modifying unrelated copy',()=>{
 assert.equal(translate('en','목적에 맞는 방 만들기'),'Create an album with a purpose');
 assert.equal(translate('en','이 방에 새로운 순간을 담아보세요.'),'Make room for your next memory.');
 for(const key of Object.keys(english))assert.doesNotMatch(translate('en',key),/\ba album\b/i);
 assert.equal(translate('en','My room in Rome'),'My room in Rome');
});
