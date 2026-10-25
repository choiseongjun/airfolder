import type {StoryEntry} from './trip-story';
import {characterAnimals} from './character-style';
import {characterScene} from './character-scene';
import {crewText} from './crew-copy';
export async function exportStoryCard(title:string,entries:StoryEntry[],page:number,pages:number,locale:'ko'|'en'='ko'){
 const ct=(key:string,...values:(string|number)[])=>crewText(locale,key,...values);
 await document.fonts.ready;
 const load=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('IMAGE_UNAVAILABLE'));i.src=src;});
 const visible=entries.slice(0,3),images=await Promise.all(visible.map(e=>Promise.all(e.photos.slice(0,3).map(p=>load(p.src)))));
 const avatars=await Promise.all(entries.map(e=>e.avatar?load(e.avatar).catch(()=>null):null));
 const atlas=await load('/characters/memory-friends-v1.png');
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=visible.length===1?1560:1920;const c=canvas.getContext('2d');if(!c)throw Error('CANVAS');
 c.fillStyle='#fff8f0';c.fillRect(0,0,1080,1920);c.fillStyle='#99452c';c.fillRect(0,0,1080,16);
 const lines=(text:string,x:number,y:number,width:number,lineHeight:number,max:number)=>{let line='',row=0;for(const ch of [...text.replace(/\s+/g,' ')]){if(c.measureText(line+ch).width>width){if(row===max-1){c.fillText(line.slice(0,-1)+'…',x,y+row*lineHeight);return;}c.fillText(line,x,y+row++*lineHeight);line='';}line+=ch;}c.fillText(line,x,y+row*lineHeight);};
 c.font='24px sans-serif';c.fillText('SAME TRIP, DIFFERENT MEMORIES',64,84);c.fillStyle='#30251f';c.font='bold 56px serif';lines(title,64,160,952,66,2);
 const draw=(i:HTMLImageElement,x:number,y:number,w:number,h:number)=>{const ratio=Math.max(w/i.width,h/i.height);c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.drawImage(i,x+(w-i.width*ratio)/2,y+(h-i.height*ratio)/2,i.width*ratio,i.height*ratio);c.restore();};
 const rowHeight=(canvas.height-440)/Math.max(visible.length,1);
 visible.forEach((e,n)=>{const top=280+n*rowHeight,photoHeight=visible.length===1?740:visible.length===2?420:250;
  const group=images[n],width=(952-(group.length-1)*12)/Math.max(group.length,1);
  group.forEach((photo,i)=>draw(photo,64+i*(width+12),top,width,photoHeight));
  const y=top+(group.length?photoHeight:0)+20;
  const scene=characterScene(e.animal),height=rowHeight-photoHeight-36,size=visible.length===3?92:150;
  c.fillStyle=scene.background;c.beginPath();c.roundRect(64,y,952,height,22);c.fill();
  c.fillStyle=scene.ink;c.font='22px sans-serif';c.fillText(ct(scene.label),90,y+34);c.font='34px serif';c.fillText(scene.symbol,948,y+38);
  c.fillStyle='#41382f';c.font='30px sans-serif';lines(e.body,visible.length>1?110+size:90,y+82,visible.length>1?874-size:894,40,visible.length===3?2:3);
  const bottom=y+height-size-12;
  c.fillStyle='#ffffff66';c.beginPath();c.roundRect(98+size*.6,bottom-10,50,62,[25,25,0,0]);c.fill();
  if(avatars[n])draw(avatars[n]!,94,bottom,size,size);else{const index=Math.max(0,characterAnimals.findIndex(a=>a.id===e.animal)),w=atlas.width/6,h=atlas.height/5;c.save();c.globalCompositeOperation='multiply';c.drawImage(atlas,index%6*w,Math.floor(index/6)*h,w,h,90,bottom,size,size);c.restore();}
  c.fillStyle=scene.ink;c.font='bold 25px sans-serif';lines(ct('{0}의 기억',e.name),110+size,bottom+size*.7,850-size,32,1);
 });
 c.fillStyle='#78675e';c.font='24px sans-serif';c.fillText(`${ct('memonestia · 함께 만든 여행편')}   ${page+1}/${pages}`,64,canvas.height-80);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('EXPORT')),'image/png'));return new File([blob],`memonestia-trip-${page+1}.png`,{type:'image/png'});
}
