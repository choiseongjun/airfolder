"use client";
import {useEffect,useState} from 'react';
import {api} from '@/lib/client-api';
import type {Locale} from './i18n';
import MediaView from './media-view';
type Recap={id:string;folderId:string;album:string;kind:string;total:number;year:number;src:string;mediaType:string};
export function Recaps({locale,groupId,onOpen,revision}:{locale:Locale;groupId:string|null;onOpen:(id:string)=>void;revision:string}){
 const [items,setItems]=useState<Recap[]>([]),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;api<{items:Recap[]}>('/api/recaps?timezone='+encodeURIComponent(zone)+(groupId?'&groupId='+groupId:'')).then(d=>{if(active){setItems(d.items);setFailed(false);}}).catch(()=>{if(active){setItems([]);setFailed(true);}});return()=>{active=false;};},[groupId,revision]);
 if(failed)return <p className="group-hint">{locale==='ko'?'회상을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.':'Memories are temporarily unavailable.'}</p>;
 if(!items.length)return null;
 return <>{['anniversary','month'].map(kind=>{const cards=items.filter(p=>p.kind===kind);return cards.length>0&&<section className="recap-section" key={kind}><h3>{kind==='anniversary'?(locale==='ko'?'그해 오늘, 우리':'On this day'):(locale==='ko'?'지난달의 순간들':'Last month’s moments')} <small>· {cards[0].total}</small></h3><div className="recap-items">{cards.map(p=><button className="recap-item" key={p.id} onClick={()=>onOpen(p.folderId)}><MediaView src={p.src} mediaType={p.mediaType} name={p.album}/><strong>{p.album}</strong><small>{p.year}</small></button>)}</div></section>;})}</>;
}
type Notice={folderId:string;name:string;kind:string;ids:string[];unread:number;createdAt:string};
export function Notifications({locale,onOpen}:{locale:Locale;onOpen:(id:string)=>void}){
 const [items,setItems]=useState<Notice[]>([]),[error,setError]=useState(false),[loaded,setLoaded]=useState(false);
 useEffect(()=>{let active=true;api<{items:Notice[]}>('/api/notifications').then(d=>{if(active){setItems(d.items);setLoaded(true);}}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[]);
 async function open(item:Notice){try{await api('/api/notifications',{method:'PATCH',body:JSON.stringify({ids:item.ids})});onOpen(item.folderId);}catch{setError(true);}}
 return <><h2>{locale==='ko'?'우리의 새 소식':'What’s new'}</h2><p>{locale==='ko'?'공개한 사진과 내 기록에 남긴 댓글·공감만 알려드려요.':'Updates on shared photos and conversations on your memories.'}</p>{error?<p role="alert">{locale==='ko'?'소식을 불러오지 못했어요. 다시 열어주세요.':'Could not load updates. Please reopen.'}</p>:!loaded?<p>{locale==='ko'?'불러오는 중…':'Loading…'}</p>:!items.length?<p className="info-box">{locale==='ko'?'아직 새 소식이 없어요. 함께 기록하면 이곳에 모여요.':'No updates yet. Shared moments will appear here.'}</p>:<div className="notification-list">{items.map(item=><button className={item.unread?'unread':''} key={item.ids[0]} onClick={()=>void open(item)}><strong>{item.name}</strong><span>{locale==='ko'?(item.kind==='photos'?`새롭게 공개된 사진·영상 ${item.ids.length}개`:item.kind==='comment'?`내 기록에 새 댓글 ${item.ids.length}개`:`내 기록에 공감 ${item.ids.length}개`):(item.kind==='photos'?`${item.ids.length} shared photos & videos`:item.kind==='comment'?`${item.ids.length} comments on your memories`:`${item.ids.length} reactions to your memories`)}</span><small>{new Date(item.createdAt).toLocaleDateString(locale==='ko'?'ko-KR':'en-US')}{item.unread?(locale==='ko'?' · 안 읽음':' · Unread'):''}</small></button>)}</div>}</>;
}
