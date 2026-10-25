const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('Firebase Auth loads and JWKS resolves RSA keys without native require(ESM)',()=>{
 const result=spawnSync(process.execPath,['--no-experimental-require-module','-e',`
  require('firebase-admin/auth');
  const {generateKeyPairSync,sign,verify}=require('node:crypto');
  const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const jwk={...publicKey.export({format:'jwk'}),kid:'runtime-test',alg:'RS256',use:'sig'};
  const client=require('jwks-rsa')({jwksUri:'https://unused.invalid',getKeysInterceptor:async()=>[jwk]});
  client.getSigningKey('runtime-test').then(key=>{
   const data=Buffer.from('firebase-runtime-regression');
   if(!verify('RSA-SHA256',data,key.getPublicKey(),sign('RSA-SHA256',data,privateKey)))throw Error('Invalid key');
  }).catch(error=>{console.error(error.message);process.exitCode=1});
 `],{encoding:'utf8',timeout:20000});
 assert.equal(result.status,0,result.stderr||result.error?.message);
});
