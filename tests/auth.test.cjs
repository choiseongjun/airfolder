const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const loaded={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/auth-core.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(loaded,loaded.exports);
const {identityFromVerifiedClaims}=loaded.exports;
const claims={uid:'verified-uid',auth_time:1000,email:'person@example.com',email_verified:true,name:'Person',firebase:{sign_in_provider:'google.com'}};
test('verified Google identity uses Firebase UID, never email as the account key',()=>{
  assert.deepEqual(identityFromVerifiedClaims(claims,1100),{uid:'verified-uid',provider:'google.com',email:'person@example.com',name:'Person'});
});
test('Apple repeat sign-in can omit name and email',()=>{
  assert.deepEqual(identityFromVerifiedClaims({uid:'apple-uid',auth_time:1000,firebase:{sign_in_provider:'apple.com'}},1100),{uid:'apple-uid',provider:'apple.com',email:null,name:'Apple user'});
});
test('reject stale or future login, unverified email, unsupported provider and missing UID',()=>{
  for(const update of [{auth_time:699},{auth_time:1161},{auth_time:undefined},{email_verified:false},{firebase:{sign_in_provider:'password'}},{uid:''}])assert.throws(()=>identityFromVerifiedClaims({...claims,...update},1100),/INVALID_IDENTITY/);
});
test('provisioned password mode discards unverified email claims and still rejects stale tokens',()=>{
  const token={...claims,email_verified:false,firebase:{sign_in_provider:'password'}};
  assert.throws(()=>identityFromVerifiedClaims(token,1100),/INVALID_IDENTITY/);
  const identity=identityFromVerifiedClaims(token,1100,true);
  assert.equal(identity.provider,'password');
  assert.equal(identity.uid,claims.uid);
  assert.equal(identity.email,null);
  assert.throws(()=>identityFromVerifiedClaims({...token,auth_time:699},1100,true),/INVALID_IDENTITY/);
});
