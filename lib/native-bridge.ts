export type NativeCommand='SHARE_LINK'|'PICK'|'CAMERA'|'RECOMMEND'|'INCOMING'|'QUEUE'|'NOTIFICATIONS_ON'|'NOTIFICATIONS_OFF'|'DOWNLOAD'|'LOGIN'|'LOGOUT'|'DELETE_ACCOUNT'|'BACK_UNHANDLED'|'READY';
declare global {interface Window {ReactNativeWebView?:{postMessage:(data:string)=>void};__MEMOLUMI_NATIVE__?:boolean;}}
export function hasNativeBridge(){return typeof window!=='undefined'&&!!window.ReactNativeWebView&&window.__MEMOLUMI_NATIVE__===true;}
export function sendNative(type:NativeCommand,details:{folderId?:string;photoId?:string;url?:string}={}){if(!hasNativeBridge())return false;window.ReactNativeWebView!.postMessage(JSON.stringify({type,...details}));return true;}
