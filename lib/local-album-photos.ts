import type { MemoryItem } from '@/app/memories';
/** Local previews contain no invented contributors and never need a server session. */
export function localAlbumPhotos(urls: string[], day = '2026-10-01'): MemoryItem[] {
  return urls.map((src, index) => ({id:`local-photo-${index}`,kind:'photo',body:'',src,day,shared:false,mine:true,author:'',revision:0,updatedAt:day,created:Date.parse(`${day}T12:00:00Z`)+index,mediaType:'image'}));
}
