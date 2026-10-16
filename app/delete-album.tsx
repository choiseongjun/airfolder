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
 <button type="button" className="option-button" style={{color:'#a33e35'}} aria-expanded={open} onClick={()=>setOpen(!open)} disabled={busy}><Trash2 size={18}/>{ko?'휴지통으로 이동':'Move to trash'}</button>
 {open&&<section aria-label={ko?'앨범 삭제 확인':'Confirm album deletion'} style={{background:'#fff3ef',padding:18,borderRadius:14}}>
 <h3>{ko?'앨범을 휴지통으로 옮길까요?':'Move this album to trash?'}</h3>
 <p>{ko?'사진·영상·기록을 30일 동안 보관하며 소유자가 휴지통에서 복원할 수 있어요. 그동안 멤버와 공유 링크에서는 보이지 않습니다. 30일 후 자동으로 영구 삭제됩니다. 보관 중에는 저장 용량에 포함됩니다.':'Photos, videos and stories are kept for 30 days. The owner can restore them from Trash during that time. Members and shared links cannot access the album while it is trashed. After 30 days it is automatically deleted permanently. Stored files still count toward your quota.'}</p>
 <label style={{display:'grid',gap:8,margin:'16px 0'}}>{ko?'확인을 위해 앨범 이름을 그대로 입력해 주세요.':'Type the exact album name to confirm.'}<strong>{name}</strong><input value={typed} onChange={e=>setTyped(e.target.value)} disabled={busy} autoComplete="off" aria-label={ko?'삭제할 앨범 이름':'Album name to delete'} style={{padding:12,border:'1px solid #caa99e',borderRadius:8,width:'100%'}}/></label>
 {pending&&<p role="status">{ko?'전송 중이거나 아직 저장되지 않은 사진이 있어요. 업로드를 완료한 뒤 삭제해 주세요.':'Finish pending uploads before deleting this album.'}</p>}
 {error&&<p role="alert">{error}</p>}
 <div style={{display:'flex',gap:10}}><button className="secondary-button" disabled={busy} onClick={()=>{setOpen(false);setTyped('');}}>{ko?'취소':'Cancel'}</button><button className="primary-button" style={{background:'#a33e35'}} disabled={busy||pending||typed!==name} onClick={remove}>{busy?(ko?'삭제 중…':'Deleting…'):(ko?'휴지통으로 이동':'Move to trash')}</button></div>
 </section>}
 </div>;
}
