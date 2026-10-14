const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
class ApiError extends Error{constructor(status,code){super(code);this.status=status;}}
const out={};
new Function('exports','require',ts.transpileModule(fs.readFileSync('lib/upload-disk.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(out,name=>name==='./server'?{ApiError}:require(name));
function request(megabytes){
  let step=0;const chunk=Buffer.alloc(1024*1024,37);
  const body=new ReadableStream({pull(controller){
    if(step===0)controller.enqueue(Buffer.from('--test-boundary\r\nContent-Disposition: form-data; name="file"; filename="original.mp4"\r\nContent-Type: video/mp4\r\n\r\n'));
    else if(step<=megabytes)controller.enqueue(chunk);
    else{controller.enqueue(Buffer.from('\r\n--test-boundary--\r\n'));controller.close();}
    step++;
  }});
  return new Request('http://localhost/upload',{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=test-boundary'},body,duplex:'half'});
}
test('64 MiB chunked upload is written without a body-sized buffer and cleaned up',async()=>{
  const upload=await out.uploadDisk(request(64),65*1024*1024);
  const path=upload.path;
  try{assert.equal(upload.size,64*1024*1024);assert.equal(upload.filename,'original.mp4');let size=0;for await(const chunk of fs.createReadStream(path)){size+=chunk.length;assert.ok(chunk.every(byte=>byte===37));}assert.equal(size,upload.size);}
  finally{await upload.cleanup();}
  assert.equal(fs.existsSync(path),false);
});
test('oversize chunked multipart is rejected without Content-Length',async()=>{
  await assert.rejects(()=>out.uploadDisk(request(2),1024*1024),error=>error.status===413);
});
test('exactly the configured maximum is accepted',async()=>{
  const upload=await out.uploadDisk(request(1),1024*1024);
  try{assert.equal(upload.size,1024*1024);}finally{await upload.cleanup();}
});
test('malformed multipart is rejected',async()=>{
  await assert.rejects(()=>out.uploadDisk(new Request('http://localhost/upload',{method:'POST',body:'broken'}),1024),error=>error.status===400);
});
