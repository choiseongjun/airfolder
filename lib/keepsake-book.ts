export type BookInput = {title:string;companions:string;story:string;photos:string[];locale:'ko'|'en'};
export function bookPageCount(photos:number) { return photos + 2; }

/** All pages are rendered locally, with the user's words unchanged. */
export async function renderKeepsakeBook(input:BookInput):Promise<File[]> {
 if(!input.photos.length||input.photos.length>8)throw Error('INVALID_PHOTOS');
 await document.fonts.ready;
 const files:File[]=[];
 const load=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('INVALID_PHOTO'));img.src=src;});
 const ko=input.locale==='ko',total=bookPageCount(input.photos.length);
 for(let page=0;page<total;page++){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;
  const c=canvas.getContext('2d');if(!c)throw Error('CANVAS_UNAVAILABLE');
  c.fillStyle='#fbf6ed';c.fillRect(0,0,1080,1440);c.fillStyle='#9b4f36';
  c.font='20px sans-serif';c.fillText('MEMONESTIA / A LITTLE BOOK OF US',80,77);
  const text=(value:string,y:number,size:number,maxHeight:number)=>{
   let lines:string[]=[];
   let paragraphs=value.split('\n');
   do {c.font=`${size}px sans-serif`;lines=[];for(const paragraph of paragraphs){let line='';for(const ch of [...paragraph]){if(c.measureText(line+ch).width>920){lines.push(line);line='';}line+=ch;}lines.push(line);}if(lines.length*size*1.65<=maxHeight)break;if(size<=18){paragraphs=[value.replace(/\s+/g,' ')];size=20;}size-=2;}while(size>0);
   c.fillStyle='#43372f';lines.forEach((line,i)=>c.fillText(line,80,y+i*size*1.65));
  };
  if(page===0){
   text(input.title,185,66,250);text(input.companions,400,28,95);
   const img=await load(input.photos[0]),scale=Math.min(920/img.width,680/img.height);
   c.drawImage(img,80+(920-img.width*scale)/2,510+(680-img.height*scale)/2,img.width*scale,img.height*scale);
   c.fillStyle='#9b4f36';c.font='27px serif';c.fillText(ko?'사진은 장면을, 이야기는 마음을.':'A photo keeps the day. A story keeps the feeling.',80,1275);
  }else if(page===total-1){
   c.fillStyle='#9b4f36';c.font='23px sans-serif';c.fillText(ko?'그날을 기억하는 한마디':'THE WORDS I WANT TO KEEP',80,190);
   text(input.story,300,40,900);
  }else{
   const img=await load(input.photos[page-1]),scale=Math.min(920/img.width,1030/img.height);
   c.drawImage(img,80+(920-img.width*scale)/2,170+(1030-img.height*scale)/2,img.width*scale,img.height*scale);
   text(`${String(page).padStart(2,'0')} / ${input.title}`,1270,25,55);
  }
  c.fillStyle='#8e8072';c.font='20px sans-serif';c.fillText('memonestia',80,1370);c.fillText(`${page+1} / ${total}`,930,1370);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('EXPORT_FAILED')),'image/jpeg',.94));
  files.push(new File([blob],`memory-book-${String(page+1).padStart(2,'0')}.jpg`,{type:'image/jpeg'}));
  canvas.width=canvas.height=1;
 }
 return files;
}

export async function bookZip(files:File[]) {
 const {zip}=await import('fflate');
 const entries:Record<string,Uint8Array>={};
 for(const file of files)entries[file.name]=new Uint8Array(await file.arrayBuffer());
 return new Promise<Blob>((resolve,reject)=>zip(entries,{level:0},(err,data)=>err?reject(err):resolve(new Blob([new Uint8Array(data)],{type:'application/zip'}))));
}
