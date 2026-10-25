import type {StoryEntry} from './trip-story';
import {characterAnimals} from './character-style';
export async function exportStoryCard(title:string,entries:StoryEntry[],page:number,pages:number){
 await document.fonts.ready;
 const load=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('IMAGE_UNAVAILABLE'));i.src=src;});
 const photos=entries.flatMap(e=>e.photos).slice(0,4),images=await Promise.all(photos.map(p=>load(p.src)));
 const avatars=await Promise.all(entries.map(e=>e.avatar?load(e.avatar).catch(()=>null):null));
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const c=canvas.getContext('2d');if(!c)throw Error('CANVAS');
 c.fillStyle='#fff8f0';c.fillRect(0,0,1080,1920);c.fillStyle='#99452c';c.fillRect(0,0,1080,16);
 const lines=(text:string,x:number,y:number,width:number,lineHeight:number,max:number)=>{let line='',row=0;for(const ch of [...text.replace(/\s+/g,' ')]){if(c.measureText(line+ch).width>width){if(row===max-1){c.fillText(line.slice(0,-1)+'…',x,y+row*lineHeight);return;}c.fillText(line,x,y+row++*lineHeight);line='';}line+=ch;}c.fillText(line,x,y+row*lineHeight);};
 c.font='24px sans-serif';c.fillText('SAME TRIP, DIFFERENT MEMORIES',64,84);c.fillStyle='#30251f';c.font='bold 56px serif';lines(title,64,160,952,66,2);
 const draw=(i:HTMLImageElement,x:number,y:number,w:number,h:number)=>{const ratio=Math.max(w/i.width,h/i.height);c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.drawImage(i,x+(w-i.width*ratio)/2,y+(h-i.height*ratio)/2,i.width*ratio,i.height*ratio);c.restore();};
 images.forEach((i,n)=>{
  if(images.length===1)draw(i,64,280,952,526);
  else if(images.length===2)draw(i,64+n*484,280,470,526);
  else if(images.length===3)draw(i,n===0?64:548,n===2?550:280,470,n===0?526:256);
  else draw(i,64+n%2*484,280+Math.floor(n/2)*270,470,256);
 });
 c.fillStyle='#78675e';c.font='26px sans-serif';c.fillText('이번 여행에서 가장 웃겼던 순간은?',64,880);
 entries.slice(0,3).forEach((e,n)=>{const y=930+n*250;c.fillStyle=n%2?'#f0f2e9':'#f5e5d9';c.beginPath();c.roundRect(64,y,952,224,24);c.fill();
  if(avatars[n]){c.save();c.beginPath();c.arc(126,y+58,34,0,Math.PI*2);c.clip();draw(avatars[n]!,92,y+24,68,68);c.restore();}else{c.font='52px "Segoe UI Emoji",sans-serif';c.fillText(characterAnimals.find(a=>a.id===e.animal)?.emoji||'🐱',92,y+76);}
  c.fillStyle='#99452c';c.font='bold 28px sans-serif';lines(e.name,182,y+66,790,34,1);c.fillStyle='#30251f';c.font='30px sans-serif';lines(e.body,94,y+118,890,40,3);
 });
 c.fillStyle='#78675e';c.font='24px sans-serif';c.fillText(`memonestia · 함께 만든 여행편   ${page+1}/${pages}`,64,1840);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('EXPORT')),'image/png'));return new File([blob],`memonestia-trip-${page+1}.png`,{type:'image/png'});
}
