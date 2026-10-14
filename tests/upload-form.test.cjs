const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
class ApiError extends Error{constructor(status,code){super(code);this.status=status;}}
const out={};
new Function('exports','require',ts.transpileModule(fs.readFileSync('lib/upload-form.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(out,()=>({ApiError}));
test('chunked uploads cannot bypass the size cap without Content-Length',async()=>{
 let canceled=false;
 const body=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(40));},cancel(){canceled=true;}});
 await assert.rejects(()=>out.uploadForm(new Request('http://localhost/upload',{method:'POST',body,duplex:'half'}),64),error=>error.status===413);
 assert.equal(canceled,true);
});
test('bounded multipart parsing preserves binary originals and rejects invalid forms',async()=>{
 const form=new FormData(),bytes=new Uint8Array([0,255,1,128,42]);form.set('file',new Blob([bytes]),'original.bin');
 const result=await out.uploadForm(new Request('http://localhost/upload',{method:'POST',body:form}),1024);
 assert.deepEqual(new Uint8Array(await result.get('file').arrayBuffer()),bytes);
 await assert.rejects(()=>out.uploadForm(new Request('http://localhost/upload',{method:'POST',body:'invalid'}),1024),error=>error.status===400);
});
