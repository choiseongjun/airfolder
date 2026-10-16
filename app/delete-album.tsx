'use client';
import {useState} from 'react';
import {Trash2} from 'lucide-react';
import {api} from '@/lib/client-api';

export default function DeleteAlbum({id,name,ko,pending,onDeleted}:{id:string;name:string;ko:boolean;pending:boolean;onDeleted:()=>void}) {
 const [open,setOpen]=useState(false),[typed,setTyped]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function remove(){
  if(busy||pending||typed!==name)return;
  setBusy(true);setError('');
  try{await api('/api/folders',{method:'DELETE',body:JSON.stringify({id,name,confirm:'DELETE_ALBUM'})});onDeleted();}
  catch{setError(ko?'삭제하지 못했어요. 앨범 소유자인지 확인하고 다시 시도해 주세요.':'Could not delete. Check album ownership and try again.');}
  finally{setBusy(false);}
 }
 return <div style={{borderTop:'1px solid #e5d6cf',marginTop:24,paddingTop:16}}>
 <button type="button" className="option-button" style={{color:'#a33e35'}} aria-expanded={open} onClick={()=>setOpen(!open)} disabled={busy}><Trash2 size={18}/>{ko?'앨범 삭제':'Delete album'}</button>
 {open&&<section aria-label={ko?'앨범 삭제 확인':'Confirm album deletion'} style={{background:'#fff3ef',padding:18,borderRadius:14}}>
 <h3>{ko?'이 앨범을 삭제할까요?':'Delete this album?'}</h3>
 <p>{ko?'모든 멤버가 올린 사진·영상의 원본과 미리보기, 기록·댓글·반응이 함께 삭제됩니다. 초대 링크는 사용할 수 없고, 공유 링크에서도 삭제된 콘텐츠를 볼 수 없어요. 그룹과 다른 앨범은 유지됩니다. 삭제는 되돌릴 수 없어요.':'This permanently deletes everyone’s photos, videos, originals, previews, stories, comments and reactions in this album. Invitations stop working and shared links lose access to deleted content. The group and other albums stay intact. This cannot be undone.'}</p>
 <label style={{display:'grid',gap:8,margin:'16px 0'}}>{ko?'확인을 위해 앨범 이름을 그대로 입력해 주세요.':'Type the exact album name to confirm.'}<strong>{name}</strong><input value={typed} onChange={e=>setTyped(e.target.value)} disabled={busy} autoComplete="off" aria-label={ko?'삭제할 앨범 이름':'Album name to delete'} style={{padding:12,border:'1px solid #caa99e',borderRadius:8,width:'100%'}}/></label>
 {pending&&<p role="status">{ko?'전송 중이거나 아직 저장되지 않은 사진이 있어요. 업로드를 완료한 뒤 삭제해 주세요.':'Finish pending uploads before deleting this album.'}</p>}
 {error&&<p role="alert">{error}</p>}
 <div style={{display:'flex',gap:10}}><button className="secondary-button" disabled={busy} onClick={()=>{setOpen(false);setTyped('');}}>{ko?'취소':'Cancel'}</button><button className="primary-button" style={{background:'#a33e35'}} disabled={busy||pending||typed!==name} onClick={remove}>{busy?(ko?'삭제 중…':'Deleting…'):(ko?'영구 삭제':'Delete permanently')}</button></div>
 </section>}
 </div>;
}
