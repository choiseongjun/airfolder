const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const loaded={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('lib/server.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>name==='./mobile-auth-core'?{nativeBearer:value=>{if(!/^Bearer [a-f0-9]{64}$/.test(value))throw Error();return value.slice(7)}}:{},loaded,loaded.exports);
const {sameOrigin}=loaded.exports;
test('browser writes require same origin in production, including spoofed loopback hosts',()=>{
 const before=process.env.NODE_ENV;try{process.env.NODE_ENV='production';
 assert.doesNotThrow(()=>sameOrigin(new Request('https://example.com/api',{headers:{origin:'https://example.com'}})));
 for(const headers of [{},{origin:'https://evil.invalid'},{origin:'http://127.0.0.1:3004',host:'127.0.0.1:3004'}])assert.throws(()=>sameOrigin(new Request('https://example.com/api',{headers})),{code:'INVALID_ORIGIN'});
 }finally{process.env.NODE_ENV=before;}
});
test('development accepts only exact loopback Origin/Host matches and preserves native auth checks',()=>{
 const before=process.env.NODE_ENV;try{process.env.NODE_ENV='development';
 assert.doesNotThrow(()=>sameOrigin(new Request('http://localhost:3004/api',{headers:{origin:'http://127.0.0.2:3004',host:'127.0.0.2:3004'}})));
 for(const headers of [{origin:'http://127.0.0.2:3004',host:'127.0.0.1:3004'},{origin:'http://evil.invalid',host:'evil.invalid'}])assert.throws(()=>sameOrigin(new Request('http://localhost:3004/api',{headers})),{code:'INVALID_ORIGIN'});
 assert.throws(()=>sameOrigin(new Request('http://localhost:3004/api',{headers:{authorization:'Bearer invalid'}})),{code:'INVALID_NATIVE_TOKEN'});
 assert.doesNotThrow(()=>sameOrigin(new Request('http://localhost:3004/api',{headers:{authorization:'Bearer '+'a'.repeat(64)}})));
 }finally{process.env.NODE_ENV=before;}
});
