import {readFileSync,createReadStream,createWriteStream,existsSync} from 'node:fs';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseEnv} from 'node:util';
import {spawn} from 'node:child_process';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import pg from 'pg';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import {createClient} from '@supabase/supabase-js';

// Separate persistent worker: never run a long transcode inside a request lifecycle.
const envFile=new URL('../.env.local',import.meta.url);
const env={...(existsSync(envFile)?parseEnv(readFileSync(envFile,'utf8')):{}),...process.env};
const db=new pg.Client({connectionString:env.DATABASE_URL});
const store=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY).storage.from('snaproom-photos');
const once=process.argv.includes('--once');let stopping=false;
process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
function transcode(input,output){
  return new Promise((resolve,reject)=>{
    const child=spawn(env.FFMPEG_PATH||ffmpeg,[
      '-nostdin','-hide_banner','-loglevel','error','-y','-protocol_whitelist','file,pipe,crypto','-i',input,
      '-map','0:v:0','-map','0:a:0?','-sn','-dn','-map_metadata','-1','-map_chapters','-1',
      '-vf',"scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
      '-c:v','libx264','-preset','veryfast','-crf','28','-maxrate','2500k','-bufsize','5000k',
      '-pix_fmt','yuv420p','-threads','2','-c:a','aac','-b:a','96k','-ac','2','-movflags','+faststart',output
    ],{stdio:['ignore','ignore','ignore'],windowsHide:true});
    const timeout=setTimeout(()=>child.kill(),60*60*1000);
    child.once('error',error=>{clearTimeout(timeout);reject(error);});
    child.once('exit',code=>{clearTimeout(timeout);if(code===0)resolve();else reject(new Error('TRANSCODE_FAILED'));});
  });
}
async function processOne(){
  // Lease survives restarts. A session advisory lock prevents duplicate long-running encodes.
  const rows=await db.query(`SELECT p.* FROM snaproom.photos p JOIN snaproom.viewers v ON v.id=p.owner_id
    WHERE p.preview_path IS NULL AND p.preview_status IN ('pending','processing')
      AND p.preview_retry_at<=now() AND v.deletion_requested_at IS NULL
    ORDER BY p.preview_retry_at LIMIT 10`);
  for(const photo of rows.rows){
    const key='preview:'+photo.id;
    if(!(await db.query('SELECT pg_try_advisory_lock(hashtext($1)) ok',[key])).rows[0].ok)continue;
    let dir,uploaded=false,previewPath;
    try{
      const claim=await db.query(`UPDATE snaproom.photos SET preview_status='processing',preview_attempts=preview_attempts+1,
        preview_retry_at=now()+interval '65 minutes' WHERE id=$1 AND preview_path IS NULL AND preview_retry_at<=now() RETURNING id`,[photo.id]);
      if(!claim.rowCount)continue;
      dir=await mkdtemp(join(tmpdir(),'memolumi-preview-'));
      const input=join(dir,'input'),video=photo.mime.startsWith('video/'),output=join(dir,video?'preview.mp4':'preview.jpg');
      const signed=await store.createSignedUrl(photo.object_path,7200);
      if(signed.error)throw new Error('ORIGINAL_UNAVAILABLE');
      const response=await fetch(signed.data.signedUrl,{signal:AbortSignal.timeout(30*60*1000)});
      if(!response.ok||!response.body)throw new Error('ORIGINAL_UNAVAILABLE');
      await pipeline(Readable.fromWeb(response.body),createWriteStream(input));
      if(video)await transcode(input,output);
      else await sharp(input,{limitInputPixels:100000000}).rotate().resize({width:2560,height:2560,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toFile(output);
      if((await stat(output)).size>Math.max(Number(photo.size_bytes),1048576))throw new Error('PREVIEW_BUDGET_EXCEEDED');
      const mime=video?'video/mp4':'image/jpeg';
      previewPath=photo.object_path.replace(/\.[^.]+$/,video?'.preview.mp4':'.preview.jpg');
      const result=await store.upload(previewPath,createReadStream(output),{contentType:mime,upsert:true});
      if(result.error)throw new Error('PREVIEW_STORAGE_FAILED');uploaded=true;
      const saved=await db.query(`UPDATE snaproom.photos SET preview_path=$2,preview_mime=$3,preview_status='ready',preview_size_bytes=$4
        WHERE id=$1 AND EXISTS(SELECT 1 FROM snaproom.viewers v WHERE v.id=owner_id AND v.deletion_requested_at IS NULL) RETURNING id`,[photo.id,previewPath,mime,(await stat(output)).size]);
      if(!saved.rowCount){await store.remove([previewPath]);uploaded=false;}
      console.log('Preview completed');
    }catch(error){
      if(uploaded&&previewPath)await store.remove([previewPath]);
      await db.query(`UPDATE snaproom.photos SET preview_status=CASE WHEN preview_attempts>=3 OR $2 THEN 'failed' ELSE 'pending' END,
        preview_retry_at=now()+interval '5 minutes' WHERE id=$1`,[photo.id,error?.message==='PREVIEW_BUDGET_EXCEEDED']);
      console.error('Preview failed; original retained. Retrying up to three times.');
    }finally{
      if(dir)await rm(dir,{recursive:true,force:true});
      await db.query('SELECT pg_advisory_unlock(hashtext($1))',[key]);
    }
    return true;
  }
  return false;
}
try{await db.connect();do{const worked=await processOne();if(once&&!worked)break;if(!worked)await new Promise(resolve=>setTimeout(resolve,5000));}while(!stopping);}finally{await db.end();}
