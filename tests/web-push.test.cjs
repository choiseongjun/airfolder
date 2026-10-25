const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const mod={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/web-push-validation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(mod,mod.exports);
const {validPushEndpoint,validPushKey}=mod.exports;
test('push destinations reject arbitrary servers, credentials, ports and deceptive suffixes',()=>{
 for(const endpoint of ['https://127.0.0.1/x','http://fcm.googleapis.com/x','https://fcm.googleapis.com.evil.test/x','https://user@fcm.googleapis.com/x','https://fcm.googleapis.com:8443/x','https://updates.push.services.mozilla.com.evil.test/x','file:///etc/passwd'])assert.equal(validPushEndpoint(endpoint),false,endpoint);
 for(const endpoint of ['https://fcm.googleapis.com/fcm/send/test','https://updates.push.services.mozilla.com/wpush/v2/test','https://web.push.apple.com/test','https://wns2-db5p.notify.windows.com/test'])assert.equal(validPushEndpoint(endpoint),true);
 assert(validPushKey(Buffer.alloc(65).toString('base64url'),65));assert(!validPushKey('invalid',65));assert(!validPushKey({},16));
});
