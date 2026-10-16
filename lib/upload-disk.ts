import busboy from 'busboy';
import {createWriteStream} from 'node:fs';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {ApiError} from './server';

// Stream to bounded temporary storage; never materialize a multi-GB request in RAM.
export async function uploadDisk(request: Request, limit: number) {
  if(!request.body)throw new ApiError(400,'INVALID_UPLOAD');
  const dir=await mkdtemp(join(tmpdir(),'memolumi-upload-')), path=join(dir,'original');
  // A locked handle (e.g. Windows holding the file briefly after a read stream closes) must never mask an otherwise-successful response.
  const cleanup=()=>rm(dir,{recursive:true,force:true}).catch(()=>{});
  const fields:Record<string,string>={};let filename='',seen=false,invalid=false,oversize=false,total=0;
  const writes:Promise<void>[]=[];
  try {
    const parser=busboy({headers:{'content-type':request.headers.get('content-type')||''},limits:{files:1,fields:8,fieldSize:2048,fileSize:limit+1,parts:9}});
    const source=Readable.fromWeb(request.body as import('node:stream/web').ReadableStream);
    const bounded=new Transform({transform(chunk,_,done){total+=chunk.length;done(total>limit+65536?new ApiError(413,'MEDIA_TOO_LARGE'):null,chunk);}});
    parser.on('field',(name,value,info)=>{if(info.valueTruncated||Object.hasOwn(fields,name))invalid=true;fields[name]=value;});
    parser.on('file',(name,file,info)=>{
      seen=true;filename=info.filename||'Media';
      if(name!=='file')invalid=true;
      file.on('limit',()=>{oversize=true;});
      const write=pipeline(file,createWriteStream(path,{flags:'wx'}));
      // Attach immediately so disk failures cannot become unhandled rejections.
      write.catch(error=>parser.destroy(error));writes.push(write);
    });
    for(const event of ['filesLimit','fieldsLimit','partsLimit'])parser.on(event,()=>{invalid=true;});
    await pipeline(source,bounded,parser,{signal:request.signal});await Promise.all(writes);
    if(oversize)throw new ApiError(413,'MEDIA_TOO_LARGE');
    if(!seen||invalid)throw new ApiError(400,'INVALID_UPLOAD');
    const size=(await stat(path)).size;if(!size)throw new ApiError(400,'INVALID_UPLOAD');
    if(size>limit)throw new ApiError(413,'MEDIA_TOO_LARGE');
    return {fields,filename,path,size,cleanup};
  } catch(error){await Promise.allSettled(writes);await cleanup();if(error instanceof ApiError)throw error;throw new ApiError(400,'INVALID_UPLOAD');}
}
