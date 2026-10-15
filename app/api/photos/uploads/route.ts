import {ApiError,json,requireMember,safe,sameOrigin,transaction,uuid,viewer} from '@/lib/server';
import {mediaLimit} from '@/lib/media-limits';
import {requireTerms} from '@/lib/safety';

export async function POST(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),body=await json(request),id=uuid(body.id),folder=uuid(body.folderId);
 await requireTerms(who);await requireMember(folder,who);
 const size=Number(body.size),created=Number(body.created);
 if(!Number.isSafeInteger(size)||size<1||size>mediaLimit(String(body.mime)))throw new ApiError(413,'MEDIA_TOO_LARGE');
 if(!Number.isFinite(created)||created<0||created>Date.now()+86400000)throw new ApiError(400,'INVALID_DATE');
 return transaction(async db=>{
  await db.query("SELECT pg_advisory_xact_lock(hashtext('upload-staging'))");
  await db.query('DELETE FROM snaproom.upload_sessions WHERE expires_at<now()');
  const saved=await db.query('SELECT owner_id,folder_id FROM snaproom.photos WHERE id=$1',[id]);
  if(saved.rowCount){if(saved.rows[0].owner_id!==who||saved.rows[0].folder_id!==folder)throw new ApiError(409,'PHOTO_CONFLICT');return Response.json({complete:true});}
  const old=await db.query('SELECT * FROM snaproom.upload_sessions WHERE id=$1',[id]);
  if(old.rowCount){if(old.rows[0].owner_id!==who||old.rows[0].folder_id!==folder||Number(old.rows[0].size_bytes)!==size)throw new ApiError(409,'PHOTO_CONFLICT');}
  else{
   const usage=await db.query('SELECT COALESCE(sum(size_bytes),0) total,count(*) FILTER(WHERE owner_id=$1) own FROM snaproom.upload_sessions',[who]);
   if(Number(usage.rows[0].total)+size>128*1024*1024||Number(usage.rows[0].own)>=2)throw new ApiError(429,'UPLOAD_BUSY');
   await db.query('INSERT INTO snaproom.upload_sessions(id,owner_id,folder_id,size_bytes,fields) VALUES($1,$2,$3,$4,$5)',[id,who,folder,size,{id,folderId:folder,name:String(body.name||'Photo').slice(0,200),created:String(created),shared:body.shared===true||body.shared==='true'?'true':'false'}]);
  }
  const parts=await db.query('SELECT part FROM snaproom.upload_chunks WHERE upload_id=$1',[id]);
  return Response.json({complete:false,chunkSize:3145728,parts:parts.rows.map(r=>r.part)});
 });
});}

export async function PUT(request:Request){return safe(async()=>{
 sameOrigin(request);const who=await viewer(),q=new URL(request.url).searchParams,id=uuid(q.get('id')),part=Number(q.get('part'));
 await requireTerms(who);
 if(!Number.isInteger(part)||part<0||part>16)throw new ApiError(400,'INVALID_PART');
 // Count the stream, including requests without Content-Length.
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'INVALID_UPLOAD');
 const pieces:Uint8Array[]=[];let size=0;
 try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>3145728){await reader.cancel();throw new ApiError(413,'MEDIA_TOO_LARGE');}pieces.push(item.value);}}finally{reader.releaseLock();}
 await transaction(async db=>{
  const rows=await db.query('SELECT * FROM snaproom.upload_sessions WHERE id=$1 AND owner_id=$2 AND expires_at>now() FOR UPDATE',[id,who]);
  if(!rows.rowCount)throw new ApiError(404,'UPLOAD_EXPIRED');const session=rows.rows[0];
  await requireMember(session.folder_id,who);
  if(size!==Math.min(3145728,Number(session.size_bytes)-part*3145728)||!size)throw new ApiError(400,'INVALID_PART');
  await db.query('INSERT INTO snaproom.upload_chunks(upload_id,part,body) VALUES($1,$2,$3) ON CONFLICT(upload_id,part) DO NOTHING',[id,part,Buffer.concat(pieces)]);
 });return Response.json({ok:true});
});}
