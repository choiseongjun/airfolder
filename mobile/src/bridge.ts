export const commands=['SHARE_LINK','PICK','CAMERA','RECOMMEND','INCOMING','QUEUE','NOTIFICATIONS_ON','NOTIFICATIONS_OFF','DOWNLOAD','LOGIN','LOGOUT','DELETE_ACCOUNT','BACK_UNHANDLED','READY'] as const;
export type Command=typeof commands[number];
export function isTrustedPage(value:string,origin:string){try{return new URL(value).origin===origin;}catch{return false;}}
export function parseCommand(data:string,url:string,origin:string):{type:Command;folderId?:string;photoId?:string;url?:string}{
 if(!isTrustedPage(url,origin)||data.length>2048)throw new Error('INVALID_BRIDGE');
 const b=JSON.parse(data);if(!b||!commands.includes(b.type))throw new Error('INVALID_BRIDGE');
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 if(['PICK','CAMERA','RECOMMEND','INCOMING'].includes(b.type)&&!uuid.test(b.folderId||''))throw new Error('INVALID_FOLDER');
 if(b.type==='DOWNLOAD'&&!uuid.test(b.photoId||''))throw new Error('INVALID_PHOTO');
 if(b.type==='SHARE_LINK'){const link=new URL(b.url);if(link.origin!==origin||!/^\/s\/[a-f0-9]{64}$/.test(link.pathname))throw new Error('INVALID_SHARE_URL');}
 return {type:b.type,folderId:b.folderId,photoId:b.photoId,url:b.url};
}
// JSON is data, never executable page input. No credentials are sent through the bridge.
export function eventScript(value:object){return `window.dispatchEvent(new CustomEvent('memolumi:native',{detail:${JSON.stringify(value).replace(/</g,'\\u003c')}}));true;`;}
