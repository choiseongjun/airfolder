const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function browser(){
 let now=1800000000000,n=0,cookie='';
 const document={referrer:'https://l.threads.com/',get cookie(){return cookie},set cookie(s){cookie=s.split(';')[0]}};
 const globals={exports:{},window:{},document,navigator:{},location:{search:'?utm_source=threads&utm_medium=social&utm_campaign=family',hostname:'memonestia.xyz',protocol:'https:'},URL,URLSearchParams,crypto:{randomUUID:()=>`12345678-1234-4234-8234-${String(++n).padStart(12,'0')}`},Date:{now:()=>now}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/visit-session.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,globals);
 return {api:globals.exports,globals,advance:ms=>now+=ms};
}
test('internal navigation and activity keep a visit, inactivity starts another',()=>{
 const b=browser(),first=b.api.captureVisitSession();b.globals.location.search='';
 b.advance(29*60000);assert.equal(b.api.captureVisitSession().session_id,first.session_id);
 b.advance(29*60000);assert.equal(b.api.captureVisitSession().session_id,first.session_id);
 b.advance(30*60000);assert.notEqual(b.api.captureVisitSession().session_id,first.session_id);
});
test('a different campaign gets its own visit while reloading the same campaign does not',()=>{
 const b=browser(),first=b.api.captureVisitSession();assert.equal(first.session_campaign,'family');
 assert.equal(b.api.captureVisitSession().session_id,first.session_id);
 b.globals.location.search='?utm_source=threads&utm_medium=social&utm_campaign=couple';
 const second=b.api.captureVisitSession();assert.notEqual(second.session_id,first.session_id);assert.equal(second.session_campaign,'couple');
});
test('privacy opt-outs and blocked cookie storage cannot break the product',()=>{
 for(const signal of ['doNotTrack','globalPrivacyControl']){const b=browser();b.globals.navigator[signal]=signal==='doNotTrack'?'1':true;assert.equal(b.api.captureVisitSession(),null);assert.equal(b.globals.document.cookie,'');}
 const b=browser();Object.defineProperty(b.globals.document,'cookie',{get(){throw Error('blocked')}});assert.equal(b.api.captureVisitSession(),null);
});
test('forged identifiers, expired sessions and private query content are rejected',()=>{
 const b=browser();assert.equal(b.api.sessionFromCookie('memonestia_visit=secret'),null);
 b.globals.location.search='?utm_source=user%40example.com&utm_campaign=https%3A%2F%2Fprivate.test%2Fsecret';
 const s=b.api.captureVisitSession();assert.equal(s.session_source,'threads');assert.equal(s.session_campaign,'none');
 b.advance(31*60000);assert.equal(b.api.sessionFromCookie(b.globals.document.cookie),null);
});
