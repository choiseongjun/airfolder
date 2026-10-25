'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {api} from '@/lib/client-api';
const subscribe=()=>()=>{};
const supportsPush=()=>typeof window!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window;
export default function WebPushSettings({ko}:{ko:boolean}){
 const supported=useSyncExternalStore(subscribe,supportsPush,()=>false),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if('serviceWorker'in navigator)void navigator.serviceWorker.getRegistration('/').then(async r=>setEnabled(!!await r?.pushManager.getSubscription()));},[]);
 async function toggle(){setBusy(true);setMessage('');try{
  const registration=await navigator.serviceWorker.register('/memory-sw.js',{scope:'/'});await navigator.serviceWorker.ready;
  const previous=await registration.pushManager.getSubscription();
  if(enabled&&previous){await api('/api/web-push',{method:'DELETE',body:JSON.stringify({endpoint:previous.endpoint})});await previous.unsubscribe();setEnabled(false);}
  else{const permission=await Notification.requestPermission();if(permission!=='granted'){setMessage(ko?'브라우저 알림 권한이 필요해요. 브라우저 설정에서 허용할 수 있어요.':'Allow notifications in your browser settings.');return;}
   const {publicKey}=await api<{publicKey:string}>('/api/web-push');const key=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const subscription=previous??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});await api('/api/web-push',{method:'POST',body:JSON.stringify(subscription.toJSON())});setEnabled(true);
  }
 }catch{setMessage(ko?'알림 설정을 저장하지 못했어요. 다시 시도해 주세요.':'Could not save notification settings. Please retry.');}finally{setBusy(false);}}
 return <div className="my-3 rounded-xl border border-[#efdfd5] bg-white p-4 text-xs"><strong>{ko?'이 기기에서 새 메모 알림 받기':'New memory notifications on this device'}</strong><p className="my-2 leading-5">{supported?(ko?'직접 켜면 새 메모·공유 사진 알림을 받아요. 크루 알림을 끄면 해당 크루의 알림은 오지 않아요.':'Turn on alerts for new notes and shared photos. Muted crews stay muted.'):(ko?'이 브라우저에서는 푸시를 지원하지 않아요. iPhone은 Safari에서 홈 화면에 추가한 뒤 다시 열어주세요.':'Push is unavailable in this browser. On iPhone, add the site to your Home Screen in Safari and reopen it.')}</p>{supported&&<button type="button" disabled={busy} onClick={()=>void toggle()} className="rounded-lg bg-[#99452c] px-3 py-2 text-white disabled:opacity-50">{enabled?(ko?'기기 알림 끄기':'Disable alerts'):(ko?'기기 알림 켜기':'Enable alerts')}</button>}{message&&<p role="status" className="mt-2">{message}</p>}</div>;
}
