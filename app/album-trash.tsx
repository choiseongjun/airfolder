'use client';
import {useState} from 'react';
import {Trash2,RotateCcw} from 'lucide-react';
import {api} from '@/lib/client-api';
type TrashedAlbum={id:string;name:string;deleted_at:string;expires_at:string;expired:boolean};
export default function AlbumTrash({ko,onRestored}:{ko:boolean;onRestored:()=>void}){
 const [open,setOpen]=useState(false),[albums,setAlbums]=useState<TrashedAlbum[]>([]),[loading,setLoading]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState('');
 async function load(){setLoading(true);setError('');try{setAlbums((await api<{albums:TrashedAlbum[]}>('/api/folders')).albums);}catch{setError(ko?'휴지통을 불러오지 못했어요. 다시 시도해 주세요.':'Could not load Trash. Please retry.');}finally{setLoading(false);}}
 async function restore(id:string){setBusy(id);setError('');try{await api('/api/folders',{method:'PUT',body:JSON.stringify({id,action:'restore'})});setAlbums(old=>old.filter(a=>a.id!==id));onRestored();}catch{setError(ko?'복원하지 못했어요. 보관 기간이 끝났거나 권한이 변경되었을 수 있어요.':'Could not restore. The retention period may have ended or ownership changed.');}finally{setBusy('');}}
 return <div><button className="option-button" aria-expanded={open} onClick={()=>{setOpen(!open);if(!open)void load();}}><Trash2 size={18}/>{ko?'앨범 휴지통':'Album trash'}</button>{open&&<section aria-label={ko?'앨범 휴지통':'Album trash'} style={{background:'#f4f0e8',padding:16,borderRadius:14}}>
 <p>{ko?'삭제한 앨범은 30일 동안 보관됩니다. 복원하면 기존 멤버가 다시 볼 수 있고 유효한 공유 링크도 다시 작동해요. 보관 기간이 끝나면 자동으로 영구 삭제되며, 보관 중인 사진은 저장 용량에 포함됩니다.':'Albums are kept for 30 days, then automatically deleted permanently. Restoring returns access to existing members and valid shared links. Stored photos still count toward your quota.'}</p>
 {loading?<p role="status">{ko?'휴지통을 불러오는 중…':'Loading Trash…'}</p>:!error&&!albums.length?<p>{ko?'휴지통이 비어 있어요.':'Trash is empty.'}</p>:null}
 {error&&<p role="alert">{error}<button className="text-button" onClick={load}>{ko?'다시 불러오기':'Reload'}</button></p>}
 {albums.map(a=>{const expired=a.expired;return <article key={a.id} style={{padding:'14px 0',borderTop:'1px solid #dbd6cb'}}><strong>{a.name}</strong><p>{expired?(ko?'보관 기간 만료 · 영구 삭제 대기 중':'Expired · Awaiting permanent deletion'):(ko?'복원 기한: ':'Restore before: ')+new Date(a.expires_at).toLocaleString(ko?'ko-KR':'en-US')}</p><button className="secondary-button" disabled={!!busy||expired} onClick={()=>restore(a.id)}><RotateCcw size={15}/>{busy===a.id?(ko?'복원 중…':'Restoring…'):(ko?'앨범 복원':'Restore album')}</button></article>;})}
 </section>}</div>;
}
