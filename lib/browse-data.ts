import catalog from '@/app/explore/catalog.json';
export function isBrowse(){return typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('browse')==='1';}
export function browseResponse(path:string,method='GET'):unknown{
 const q=new URL(path,'https://local.invalid'),ko=(new URLSearchParams(window.location.search).get('lang')||document.documentElement.lang)==='ko',l=ko?0:1;
 if(path==='/api/session'&&method==='POST')return {viewerId:'browse-only'};
 if(method!=='GET')throw new Error(ko?'둘러보기에서는 저장하지 않아요. 내 공간에서 시작해 주세요.':'Explore is read-only. Start in your own space to save changes.');
 const photos=catalog.albums.flatMap(a=>a.photos.map(p=>({id:p.id,roomId:a.id,name:p.caption[l],src:p.src,shared:true,mine:false,mediaType:'image',mime:'image/jpeg',originalAvailable:false,hasPreview:true,created:Date.parse(a.date+'T12:00:00Z'),uploadStatus:'uploaded',audience:'all',recipients:[]})));
 const rooms=catalog.albums.map(a=>({id:a.id,groupId:catalog.groups[a.group].id,name:a.names[l],description:a.note[l],category:a.group===0?'여행':a.group===3?'개인':'모임',image:a.photos[0].src,members:1,count:12,color:'#eee5d6',updated:'',updatedAt:Date.parse(a.date+'T12:00:00Z'),mine:false}));
 const members=[{id:'browse-editor',name:ko?'앨범 에디터':'Album editor',mine:false,owner:true,registered:false,joined_at:'2026-05-01T00:00:00Z'}];
 if(q.pathname==='/api/workspace')return {viewerId:'browse-only',account:null,rooms,photos};
 if(q.pathname==='/api/groups')return q.searchParams.has('id')?{members,invites:[]}:{groups:catalog.groups.map(g=>({id:g.id,name:g.names[l],description:ko?'둘러보기 앨범 모음':'Explore collection',mine:false,muted:false,members:1,albums:rooms.filter(r=>r.groupId===g.id).length}))};
 if(q.pathname==='/api/members')return {members,invites:[]};
 if(q.pathname==='/api/memories'){
  const album=catalog.albums.find(a=>a.id===q.searchParams.get('folderId'));
  if(!album)return {items:[],hasMore:false};
  const items=album.records.map((r,i)=>({id:album.id+'-record-'+i,kind:'record',title:album.names[l]+' · '+(i+1),body:r[l],day:album.date,created:Date.parse(album.date+'T12:00:00Z')+i,shared:true,mine:false,author:members[0].name,revision:0,updatedAt:album.date+'T12:00:00Z',photos:photos.filter(p=>p.roomId===album.id).slice(i*4,i*4+4).map(p=>({...p,kind:'photo',body:p.name,day:album.date,author:members[0].name,revision:0,updatedAt:album.date+'T12:00:00Z'}))}));
  return {items:items.reverse(),hasMore:false};
 }
 if(q.pathname==='/api/discussion')return {comments:[],count:0,liked:false,hasMore:false,shared:true,mine:false};
 if(q.pathname==='/api/notifications'||q.pathname==='/api/recaps')return {items:[]};
 if(q.pathname==='/api/share-links')return {links:[]};
 if(q.pathname==='/api/policy')return {accepted:true};
 if(q.pathname==='/api/media-limits')return {image:20971520,video:52428800,storage:524288000,used:0,remaining:524288000,serviceFull:false};
 throw new Error('BROWSE_READ_ONLY');
}
