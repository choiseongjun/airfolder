"use client";
import {useEffect,useState} from 'react';
export default function AccountNudge({ko,viewerId,onConnect}:{ko:boolean;viewerId:string;onConnect:()=>void}){
 const [visible,setVisible]=useState(false);const key=`memonestia-account-nudge:${viewerId}`;
 useEffect(()=>{const timer=setTimeout(()=>{try{setVisible(!localStorage.getItem(key));}catch{setVisible(true);}},0);return()=>clearTimeout(timer);},[key]);
 function dismiss(){setVisible(false);try{localStorage.setItem(key,'1');}catch{}}
 if(!visible)return null;
 return <aside style={{position:'fixed',bottom:88,left:'50%',transform:'translateX(-50%)',zIndex:45,width:'min(90vw,440px)',padding:18,borderRadius:18,background:'#f1ecf7',boxShadow:'0 8px 30px #0002'}} aria-label={ko?'추억 책장 보관':'Keep your bookshelf'}><strong>{ko?'다른 기기에서도 이 앨범을 이어보세요.':'Keep this album across your devices.'}</strong><p>{ko?'저장한 사진과 앨범을 Google·Apple 계정에 연결할 수 있어요.':'Connect your saved photos and albums to Google or Apple.'}</p><button className="primary-button" onClick={()=>{dismiss();onConnect();}}>{ko?'계정 연결':'Connect account'}</button><button className="text-button" onClick={dismiss}>{ko?'나중에':'Not now'}</button></aside>;
}
