const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript');
const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/database-config.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports);
test('serverless pool changes only Supabase session endpoints and preserves TLS options',()=>{
 const input='postgres://test:test@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=verify-full';const result=m.exports.databasePoolOptions(input,true),url=new URL(result.connectionString);assert.equal(url.port,'6543');assert.equal(url.searchParams.get('sslmode'),'verify-full');assert.equal(result.max,2);assert.equal(result.idleTimeoutMillis,5000);
 assert.equal(new URL(m.exports.databasePoolOptions(input,false).connectionString).port,'5432');
 assert.equal(new URL(m.exports.databasePoolOptions('postgres://test:test@db.example.com:5432/postgres',true).connectionString).port,'5432');
 assert.equal(new URL(m.exports.databasePoolOptions('postgres://test:test@pooler.supabase.com.evil.test:5432/postgres',true).connectionString).port,'5432');
});
