import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { ApiError, pool, safe, sameOrigin, transaction, viewer } from '@/lib/server';
import { requireTerms } from '@/lib/safety';
import { characterPrompt } from '@/lib/character-style';
import { CHARACTER_REQUEST_LIMIT } from '@/lib/character-photo';

export const maxDuration = 180;
const headers = {'Cache-Control':'private, no-store'};
const limit = CHARACTER_REQUEST_LIMIT;
function dailyLimit() {
 const value=Number(process.env.CHARACTER_PROFILE_DAILY_LIMIT);
 return Number.isInteger(value)&&value>=1&&value<=10?value:3;
}
function enabled() { if(process.env.CHARACTER_PROFILE_ENABLED !== '1') throw new ApiError(404,'FEATURE_DISABLED'); }
const dataUrl = (value: Buffer | null) => value ? 'data:image/webp;base64,'+value.toString('base64') : null;

export async function GET() { return safe(async()=>{
 enabled(); const who=await viewer();
 await pool().query("UPDATE snaproom.character_profiles SET draft=NULL,draft_at=NULL WHERE viewer_id=$1 AND draft_at<=now()-interval '24 hours' AND (busy_until IS NULL OR busy_until<=now())",[who]);
 const result=await pool().query("SELECT active,CASE WHEN draft_at>now()-interval '24 hours' THEN draft END AS draft,CASE WHEN usage_day=CURRENT_DATE THEN attempts ELSE 0 END AS attempts,busy_until>now() AS busy FROM snaproom.character_profiles WHERE viewer_id=$1",[who]);
 const row=result.rows[0];
 return Response.json({active:dataUrl(row?.active),draft:dataUrl(row?.draft),dailyLimit:dailyLimit(),remaining:Math.max(0,dailyLimit()-(row?.attempts||0)),busy:!!row?.busy,configured:!!process.env.OPENAI_API_KEY},{headers});
});}

export async function POST(request:Request) { return safe(async()=>{
 enabled();sameOrigin(request);const who=await viewer();await requireTerms(who);
 if(request.headers.get('x-photo-consent')!=='yes')throw new ApiError(400,'PHOTO_CONSENT_REQUIRED');
 const prompt=characterPrompt(request.headers.get('x-character-style')||'animal',request.headers.get('x-character-animal')||'cat');
 if(!prompt)throw new ApiError(400,'INVALID_CHARACTER_STYLE');
 if(!process.env.OPENAI_API_KEY)throw new ApiError(503,'AI_NOT_CONFIGURED');
 if(!['image/jpeg','image/png','image/webp'].includes(request.headers.get('content-type')||''))throw new ApiError(415,'UNSUPPORTED_PHOTO');
 if(Number(request.headers.get('content-length'))>limit)throw new ApiError(413,'PHOTO_TOO_LARGE');
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'PHOTO_REQUIRED');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new ApiError(413,'PHOTO_TOO_LARGE');}chunks.push(value);}
 let photo:Buffer;
 try{photo=await sharp(Buffer.concat(chunks),{limitInputPixels:24000000}).rotate().resize(1024,1024,{fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();}
 catch{throw new ApiError(400,'INVALID_PHOTO');}
 const id=randomUUID();
 await transaction(async db=>{
  // Serializes the small experiment's quota across sessions and server instances.
  await db.query("SELECT pg_advisory_xact_lock(hashtext('character-profile-budget'))");
  await db.query('INSERT INTO snaproom.character_profiles(viewer_id) VALUES($1) ON CONFLICT DO NOTHING',[who]);
  const row=(await db.query('SELECT attempts,usage_day=CURRENT_DATE AS today,busy_until>now() AS busy FROM snaproom.character_profiles WHERE viewer_id=$1 FOR UPDATE',[who])).rows[0];
  if(row.busy)throw new ApiError(409,'GENERATION_BUSY');
  if(row.today&&row.attempts>=dailyLimit())throw new ApiError(429,'DAILY_LIMIT');
  const total=(await db.query('SELECT COALESCE(sum(attempts),0)::int AS n FROM snaproom.character_profiles WHERE usage_day=CURRENT_DATE')).rows[0].n;
  if(total>=30)throw new ApiError(429,'EXPERIMENT_LIMIT');
  await db.query("UPDATE snaproom.character_profiles SET attempts=CASE WHEN usage_day=CURRENT_DATE THEN attempts+1 ELSE 1 END,usage_day=CURRENT_DATE,request_id=$2,busy_until=now()+interval '3 minutes' WHERE viewer_id=$1",[who,id]);
 });
 try{
  const form=new FormData();
  form.set('model','gpt-image-1.5');form.set('size','1024x1024');form.set('quality','medium');form.set('n','1');form.set('output_format','webp');
  form.set('image',new Blob([new Uint8Array(photo)],{type:'image/jpeg'}),'portrait.jpg');
  form.set('prompt',prompt);
  const response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY},body:form,signal:AbortSignal.timeout(150000)});
  if(!response.ok){const error=await response.json().catch(()=>({}));const code=error.error?.code;
   if(code==='insufficient_quota')throw new ApiError(503,'AI_BILLING_REQUIRED');
   if(response.status===401||response.status===403)throw new ApiError(503,'AI_ACCESS_REQUIRED');
   throw new ApiError(502,'GENERATION_FAILED');
  }
  const result=await response.json();const encoded=result.data?.[0]?.b64_json;
  if(typeof encoded!=='string'||encoded.length>20000000)throw new ApiError(502,'GENERATION_FAILED');
  const image=await sharp(Buffer.from(encoded,'base64'),{limitInputPixels:20000000}).resize(512,512,{fit:'cover'}).webp({quality:85}).toBuffer();
  await pool().query('UPDATE snaproom.character_profiles SET draft=$3,draft_at=now() WHERE viewer_id=$1 AND request_id=$2',[who,id,image]);
  return Response.json({draft:dataUrl(image)},{headers});
 }finally{await pool().query('UPDATE snaproom.character_profiles SET busy_until=NULL WHERE viewer_id=$1 AND request_id=$2',[who,id]);}
});}

export async function PATCH(request:Request){return safe(async()=>{
 enabled();sameOrigin(request);const who=await viewer();await requireTerms(who);
 const result=await pool().query("UPDATE snaproom.character_profiles SET active=draft,draft=NULL,draft_at=NULL WHERE viewer_id=$1 AND draft IS NOT NULL AND draft_at>now()-interval '24 hours' AND (busy_until IS NULL OR busy_until<now()) RETURNING active",[who]);
 if(!result.rowCount)throw new ApiError(409,'NO_DRAFT');
 return Response.json({active:dataUrl(result.rows[0].active)},{headers});
});}
export async function DELETE(request:Request){return safe(async()=>{
 enabled();sameOrigin(request);const who=await viewer();
 await pool().query('UPDATE snaproom.character_profiles SET active=NULL,draft=NULL,draft_at=NULL,request_id=NULL,busy_until=NULL WHERE viewer_id=$1',[who]);
 return Response.json({ok:true},{headers});
});}
