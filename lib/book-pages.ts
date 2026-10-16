import type {MemoryItem} from '../app/memories';
export type BookPage={item:MemoryItem;photos:MemoryItem[];continued:boolean;stories:MemoryItem[];card?:boolean};
export function buildBookPages(items:MemoryItem[],size:2|4|8):BookPage[]{
 const pages:BookPage[]=[];
 let pending:BookPage|undefined;
 const flush=()=>{if(pending){pages.push(pending);pending=undefined;}};
 for(const item of items){
  // Studio records deliberately share their ID with the rendered card photo.
  const card=item.kind==='record'?item.photos?.find(photo=>photo.id===item.id):undefined;
  if(card){flush();pages.push({item,photos:[card],continued:false,stories:[item],card:true});continue;}
  const photos=item.kind==='photo'?[item]:item.photos||[];
  if(!photos.length){flush();pages.push({item,photos:[],continued:false,stories:[item]});continue;}
  photos.forEach((photo,index)=>{
   if(!pending)pending={item,photos:[],continued:index>0,stories:[]};
   if(!pending.stories.some(story=>story.id===item.id))pending.stories.push(item);
   pending.photos.push(photo);
   if(pending.photos.length===size)flush();
  });
 }
 flush();return pages;
}
export function findBookPage(pages:BookPage[],previous:BookPage|undefined):number{
 if(!previous)return 0;
 const photo=previous.photos[0];
 const index=pages.findIndex(page=>photo?page.photos.some(p=>p.id===photo.id):page.stories.some(s=>s.id===previous.item.id));
 return index<0?0:index+1;
}
