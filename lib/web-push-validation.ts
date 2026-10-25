export function validPushEndpoint(value:unknown):value is string{
 if(typeof value!=='string'||value.length>2048)return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&!u.hash&&(
  u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname==='web.push.apple.com'||/^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname)
 );}catch{return false;}
}
export function validPushKey(value:unknown,length:number){return typeof value==='string'&&value.length<=100&&/^[A-Za-z0-9_-]+$/.test(value)&&Buffer.from(value,'base64url').length===length;}
