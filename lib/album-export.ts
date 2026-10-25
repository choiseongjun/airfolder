import {zipSync,strToU8} from 'fflate';
import {api} from './client-api';

export type ExportNote={id:string;body:string;author:string;created_at:string};
type ExportPhoto={id:string;name:string;mime:string;original_available:boolean;comments:ExportNote[]};
type ExportPage={title:string;photos:ExportPhoto[];notes:ExportNote[];records:{id:string;title:string;body:string;recorded_on:string}[];next:string|null};
export const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const download=(bytes:Uint8Array,name:string)=>{const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/zip'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);};
function wrap(ctx:CanvasRenderingContext2D,text:string,width:number){const lines:string[]=[];for(const paragraph of text.split('\n')){let line='';for(const char of paragraph){if(ctx.measureText(line+char).width>width&&line){lines.push(line);line='';}line+=char;}lines.push(line);}return lines;}
async function cards(photo:ExportPhoto,blob:Blob){
 const bitmap=await createImageBitmap(blob);const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1600;const ctx=canvas.getContext('2d')!;ctx.font='28px sans-serif';
 const lines=photo.comments.flatMap(n=>wrap(ctx,`${n.author || 'Member'} · ${n.body}`,1040).concat(['']));
 const result:Uint8Array[]=[];let page=0;
 do{
  ctx.fillStyle='#fff8ef';ctx.fillRect(0,0,1200,1600);ctx.fillStyle='#fff';ctx.fillRect(40,40,1120,1520);
  let y=100;
  if(!page){const ratio=Math.min(1040/bitmap.width,820/bitmap.height);ctx.drawImage(bitmap,(1200-bitmap.width*ratio)/2,60,bitmap.width*ratio,bitmap.height*ratio);y=950;}
  ctx.fillStyle='#49392e';ctx.font='28px sans-serif';
  const count=Math.floor((1500-y)/38);for(const line of lines.splice(0,count)){ctx.fillText(line,80,y);y+=38;}
  ctx.font='18px sans-serif';ctx.fillText(`memonestia · ${page+1}`,80,1530);
  const file=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('CARD_FAILED')),'image/png'));
  result.push(new Uint8Array(await file.arrayBuffer()));page++;
 }while(lines.length);
 bitmap.close();return result;
}

/** Originals + readable metadata + printable offline book + photo/notes PNGs.
 * Split large albums into bounded ZIP volumes; never silently omit a failed photo. */
export async function exportAlbum(folderId:string,onProgress:(photos:number,volumes:number)=>void,signal:AbortSignal){
 let after:string|null=null,count=0,volume=0,size=0,title='album',files:Record<string,Uint8Array>={},sections:string[]=[];
 const flush=()=>{if(!Object.keys(files).length)return;files['index.html']=strToU8(`<!doctype html><html><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:16px sans-serif;max-width:900px;margin:auto;color:#30251f}img{max-width:100%;max-height:70vh}article{break-after:page;padding:24px}p{white-space:pre-wrap}button{padding:12px}@media print{button{display:none}}</style><h1>${escapeHtml(title)}</h1><p>Extract this ZIP first. Open this file to read your memories offline. Use your browser's Print → Save as PDF to keep a book.</p>${sections.join('')}</html>`);download(zipSync(files,{level:0}),`memonestia-${folderId.slice(0,8)}-${++volume}.zip`);files={};sections=[];size=0;onProgress(count,volume);};
 do{
  signal.throwIfAborted();const page:ExportPage=await api<ExportPage>(`/api/album-export?folderId=${encodeURIComponent(folderId)}${after?'&after='+after:''}`,{signal});title=page.title;
  if(!after){files['memories.json']=strToU8(JSON.stringify({title,exportedAt:new Date().toISOString(),records:page.records,notes:page.notes},null,2));size+=files['memories.json'].length;sections.push(...page.records.map(r=>`<article><h2>${escapeHtml(r.title)}</h2><p>${escapeHtml(r.body)}</p></article>`),...page.notes.map(n=>`<article><h3>${escapeHtml(n.author)}</h3><p>${escapeHtml(n.body)}</p></article>`));}
  for(const photo of page.photos){
   signal.throwIfAborted();const response=await fetch(`/api/photos/${photo.id}/content?original=1`,{signal});if(!response.ok)throw Error(`EXPORT_PHOTO_FAILED:${count}`);
   const blob=await response.blob();if(size+blob.size>80*1024*1024)flush();
   const extension=photo.mime.split('/')[1]?.replace(/[^a-z0-9]/g,'')||'bin',name=`photos/${photo.id}.${extension}`;
   files[name]=new Uint8Array(await blob.arrayBuffer());size+=blob.size;files[`notes/${photo.id}.json`]=strToU8(JSON.stringify(photo,null,2));
   sections.push(`<article><h2>${escapeHtml(photo.name||'Photo')}</h2>${photo.mime.startsWith('image/')?`<img src="${name}" alt="">`:`<a href="${name}">Video</a>`}${photo.comments.map(n=>`<h3>${escapeHtml(n.author)}</h3><p>${escapeHtml(n.body)}</p>`).join('')}</article>`);
   if(photo.mime.startsWith('image/')){
    // HEIC and other original formats may need the service's JPEG preview for canvas.
    let image=blob;try{const probe=await createImageBitmap(blob);probe.close();}catch{const preview=await fetch(`/api/photos/${photo.id}/content`,{signal});if(!preview.ok)throw Error('EXPORT_PREVIEW_UNAVAILABLE');image=await preview.blob();}
    const rendered=await cards(photo,image);for(const [i,bytes]of rendered.entries()){files[`cards/${photo.id}-${i+1}.png`]=bytes;size+=bytes.length;}
   }
   count++;onProgress(count,volume);if(size>80*1024*1024)flush();
  }
  after=page.next;
 }while(after);
 flush();return {count,volumes:volume};
}
