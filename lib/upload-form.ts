import {ApiError} from './server';
// Enforce the cap even for chunked requests without Content-Length.
export async function uploadForm(request:Request,maxBytes:number){
  const reader=request.body?.getReader();
  if(!reader)throw new ApiError(400,'INVALID_UPLOAD');
  const chunks:Uint8Array<ArrayBuffer>[]=[];let total=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;
      if(total>maxBytes){await reader.cancel();throw new ApiError(413,'MEDIA_TOO_LARGE');}
      chunks.push(new Uint8Array(value));
    }
  }finally{reader.releaseLock();}
  try{return await new Response(new Blob(chunks),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();}
  catch{throw new ApiError(400,'INVALID_UPLOAD');}
}
