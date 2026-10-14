const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
const mod={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/bridge.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod,mod.exports);
const {parseCommand,isTrustedPage,eventScript}=mod.exports;
const origin='https://memolumi.example',id='11111111-1111-4111-8111-111111111111';
test('bridge rejects other origins, lookalikes, oversized messages and arbitrary native operations',()=>{
 for(const url of ['https://memolumi.example.evil.test/','https://evil.test/','file:///tmp/x'])assert.throws(()=>parseCommand('{"type":"LOGIN"}',url,origin));
 assert.equal(isTrustedPage(origin+'/?folder=x',origin),true);
 assert.throws(()=>parseCommand(JSON.stringify({type:'EXEC',code:'anything'}),origin,origin));
 assert.throws(()=>parseCommand('x'.repeat(2049),origin,origin));
});
test('only validated folder and photo IDs reach native adapters',()=>{
 assert.equal(parseCommand(JSON.stringify({type:'PICK',folderId:id}),origin,origin).folderId,id);
 assert.throws(()=>parseCommand(JSON.stringify({type:'DOWNLOAD',photoId:'../../private'}),origin,origin));
 assert.throws(()=>parseCommand(JSON.stringify({type:'CAMERA'}),origin,origin));
});
test('native events serialize text as data rather than executable input',()=>{const script=eventScript({type:'NOTICE',message:'</script>";alert(1)//'});assert.ok(!script.includes('</script>'));assert.ok(script.includes('\\u003c'));});
