import {mkdtemp,open,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {ApiError,pool,requireMember,uuid} from './server';

export async function stagedUpload(idValue:unknown,who:string){
 const id=uuid(idValue),db=pool();
 const rows=await db.query('SELECT * FROM snaproom.upload_sessions WHERE id=$1 AND owner_id=$2 AND expires_at>now()',[id,who]);
 if(!rows.rowCount)throw new ApiError(404,'UPLOAD_EXPIRED');const session=rows.rows[0];
 await requireMember(session.folder_id,who);
 const dir=await mkdtemp(join(tmpdir(),'memolumi-upload-')),path=join(dir,'original');
 const cleanup=()=>rm(dir,{recursive:true,force:true});
 const file=await open(path,'wx');
 try{
  for(let part=0;part<Math.ceil(Number(session.size_bytes)/3145728);part++){
   const chunks=await db.query('SELECT body FROM snaproom.upload_chunks WHERE upload_id=$1 AND part=$2',[id,part]);
   const data=chunks.rows[0]?.body as Buffer|undefined;
   if(!data||data.length!==Math.min(3145728,Number(session.size_bytes)-part*3145728))throw new ApiError(409,'UPLOAD_INCOMPLETE');
   await file.writeFile(data);
  }
 }catch(error){await file.close();await cleanup();throw error;}
 await file.close();
 return {fields:session.fields as Record<string,string>,filename:String(session.fields.name),path,size:Number(session.size_bytes),cleanup};
}
