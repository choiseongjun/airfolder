'use client';
import {useState} from 'react';
import {api} from '@/lib/client-api';

/** Only the newly uploaded photos are shared, after an explicit owner action. */
export default function AlbumFirstInvite({folderId,photoIds,title}:{folderId:string;photoIds:string[];title:string}) {
 const [link,setLink]=useState(''),[busy,setBusy]=useState(false),[shared,setShared]=useState(false),[notice,setNotice]=useState('');
 async function prepare(){
  if(busy)return;setBusy(true);setNotice('');
  try{
   if(!shared){await api('/api/photos',{method:'PATCH',body:JSON.stringify({ids:photoIds,shared:true,recipients:[]})});setShared(true);}
   const result=await api<{token:string}>('/api/invites',{method:'POST',body:JSON.stringify({folderId})});
   const url=new URL(`/join/${result.token}`,window.location.origin);
   url.searchParams.set('lang','ko');url.searchParams.set('album',folderId);url.searchParams.set('request','photos');setLink(url.toString());
  }catch{setNotice('초대 링크를 만들지 못했어요. 사진 공유가 적용되었을 수 있어요. 다시 시도하거나 앨범에서 공개 범위를 확인해 주세요.');}
  finally{setBusy(false);}
 }
 const message=`${title}, 여기 모아뒀어. 네가 찍은 사진도 같이 넣어줘!\n${link}`;
 async function copy(){try{await navigator.clipboard.writeText(message);setNotice('메시지와 링크를 복사했어요. 여행 단톡방에 붙여넣어 보내세요.');}catch{setNotice('아래 메시지를 길게 누르거나 선택해서 복사해 주세요.');}}
 async function send(){try{await navigator.share({title,text:message});}catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setNotice('공유 창을 열지 못했어요. 메시지 복사를 이용해 주세요.');}}
 return <section className="studio-share-next" aria-label="친구와 앨범 채우기">
  <h3>이제 같이 간 친구에게 보내요</h3>
  <p>친구도 링크에서 사진을 보태면 같은 앨범에 모여요.</p>
  {!link?<><p>아래 버튼을 누르면 방금 올린 사진 {photoIds.length}장을 앨범 멤버에게 공유해요. 초대 링크를 가진 사람도 미리 볼 수 있으니 함께 간 친구에게만 보내세요.</p><button className="primary-button" disabled={busy} onClick={prepare}>{busy?'초대 링크 만드는 중…':shared?'초대 링크 다시 만들기':'사진 공유하고 초대 링크 만들기'}</button></>:<><p>초대 링크는 7일 동안 유효해요. 링크 생성만으로 친구에게 전송되지는 않아요.</p><textarea aria-label="친구에게 보낼 메시지" readOnly value={message} rows={4} onFocus={e=>e.target.select()}/><button className="primary-button" onClick={copy}>메시지와 링크 복사</button>{typeof navigator!=='undefined'&&!!navigator.share&&<button className="secondary-button" onClick={send}>친구에게 보내기</button>}</>}
  {notice&&<p role="status">{notice}</p>}
 </section>;
}
