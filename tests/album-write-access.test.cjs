const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('lib/safety.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function setup(row){
 const exports={};
 class ApiError extends Error{constructor(status,message){super(message);this.status=status;}}
 vm.runInNewContext(code,{exports,require(name){
  if(name==='./server')return {ApiError,pool:()=>({query:async()=>({rows:[row]})})};
  if(name==='./policy')return {TERMS_VERSION:'current'};
  return {};
 }});
 return exports;
}
test('album writes allow an active viewer without recorded consent',async()=>{
 await setup({terms_version:null,suspended_at:null}).requireActiveViewer('viewer');
});
test('album writes still reject suspended accounts',async()=>{
 await assert.rejects(setup({terms_version:null,suspended_at:'2026-01-01'}).requireActiveViewer('viewer'),{message:'ACCOUNT_SUSPENDED',status:403});
});
test('other actions retain their explicit terms requirement',async()=>{
 await assert.rejects(setup({terms_version:null,suspended_at:null}).requireTerms('viewer'),{message:'TERMS_REQUIRED',status:403});
});
