export const bookStyles = [
 {id:'paper',ko:'따뜻한 종이',en:'Warm paper',background:'#fbf6ed',ink:'#43372f',accent:'#9b4f36',pattern:'#e9dfd0',frame:'#ffffff',layout:'classic'},
 {id:'film',ko:'필름 한 장',en:'Film diary',background:'#eee5d8',ink:'#3e3730',accent:'#805b40',pattern:'#d9ccba',frame:'#fffcf5',layout:'polaroid'},
 {id:'garden',ko:'초록의 오후',en:'Quiet garden',background:'#eff3eb',ink:'#344238',accent:'#55735a',pattern:'#d9e3d4',frame:'#fafcf7',layout:'border'},
 {id:'night',ko:'깊은 밤의 편지',en:'Midnight letter',background:'#252d3b',ink:'#f3ebdc',accent:'#d5b585',pattern:'#364153',frame:'#354052',layout:'classic'},
] as const;
export const bookPatterns = [{id:'plain',ko:'무지',en:'Plain'},{id:'dots',ko:'작은 점',en:'Dots'},{id:'grid',ko:'체크',en:'Grid'},{id:'lines',ko:'노트',en:'Ruled'}] as const;
export type BookStyle = typeof bookStyles[number]['id'];
export type BookPattern = typeof bookPatterns[number]['id'];
export type BookInput = {title:string;companions:string;story:string;photos:string[];locale:'ko'|'en';style?:BookStyle;pattern?:BookPattern};
export function bookPageCount(photos:number,hasStory=true) { return photos + (hasStory?2:1); }

/** All pages are rendered locally, with the user's words unchanged. */
export async function renderKeepsakeBook(input:BookInput):Promise<File[]> {
 if(!input.photos.length||input.photos.length>8)throw Error('INVALID_PHOTOS');
 await document.fonts.ready;
 const files:File[]=[];
 const load=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('INVALID_PHOTO'));img.src=src;});
 const ko=input.locale==='ko',hasStory=!!input.story.trim(),total=bookPageCount(input.photos.length,hasStory);
 const style=bookStyles.find(s=>s.id===input.style)??bookStyles[0],pattern=bookPatterns.find(p=>p.id===input.pattern)?.id??'plain';
 for(let page=0;page<total;page++){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;
  const c=canvas.getContext('2d');if(!c)throw Error('CANVAS_UNAVAILABLE');
  c.fillStyle=style.background;c.fillRect(0,0,1080,1440);
  c.fillStyle=style.pattern;
  if(pattern==='grid'||pattern==='lines')for(let y=0;y<1440;y+=48)c.fillRect(0,y,1080,1);
  if(pattern==='grid')for(let x=0;x<1080;x+=48)c.fillRect(x,0,1,1440);
  if(pattern==='dots')for(let y=24;y<1440;y+=36)for(let x=24;x<1080;x+=36){c.beginPath();c.arc(x,y,1.5,0,Math.PI*2);c.fill();}
  if(style.layout==='border'){c.fillStyle=style.accent;c.fillRect(35,35,2,1370);c.fillRect(1043,35,2,1370);}
  const photo=(img:HTMLImageElement,x:number,y:number,w:number,h:number)=>{
   if(style.layout==='polaroid'){c.fillStyle=style.frame;c.fillRect(x+10,y+5,w-20,h-10);x+=40;y+=35;w-=80;h-=110;}
   const scale=Math.min(w/img.width,h/img.height);c.drawImage(img,x+(w-img.width*scale)/2,y+(h-img.height*scale)/2,img.width*scale,img.height*scale);
  };
  c.fillStyle=style.accent;
  c.font='20px sans-serif';c.fillText('MEMONESTIA / A LITTLE BOOK OF US',80,77);
  const text=(value:string,y:number,size:number,maxHeight:number)=>{
   let lines:string[]=[];
   let paragraphs=value.split('\n');
   do {c.font=`${size}px sans-serif`;lines=[];for(const paragraph of paragraphs){let line='';for(const ch of [...paragraph]){if(c.measureText(line+ch).width>920){lines.push(line);line='';}line+=ch;}lines.push(line);}if(lines.length*size*1.65<=maxHeight)break;if(size<=18){paragraphs=[value.replace(/\s+/g,' ')];size=20;}size-=2;}while(size>0);
   c.fillStyle=style.ink;lines.forEach((line,i)=>c.fillText(line,80,y+i*size*1.65));
  };
  if(page===0){
   text(input.title,185,66,250);text(input.companions,400,28,95);
   const img=await load(input.photos[0]);photo(img,80,510,920,680);
   c.fillStyle=style.accent;c.font='27px serif';c.fillText(ko?'사진은 장면을, 이야기는 마음을.':'A photo keeps the day. A story keeps the feeling.',80,1275);
  }else if(hasStory&&page===total-1){
   c.fillStyle=style.accent;c.font='23px sans-serif';c.fillText(ko?'그날을 기억하는 한마디':'THE WORDS I WANT TO KEEP',80,190);
   text(input.story,300,40,900);
  }else{
   const img=await load(input.photos[page-1]);photo(img,80,170,920,1030);
   text(`${String(page).padStart(2,'0')} / ${input.title}`,1270,25,55);
  }
  c.fillStyle=style.accent;c.font='20px sans-serif';c.fillText('memonestia',80,1370);c.fillText(`${page+1} / ${total}`,930,1370);
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
