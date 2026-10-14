export async function enableNotifications(){throw new Error('NATIVE_NOTIFICATIONS_ONLY');}
export async function disableNotifications(){}
export function observeNotifications(_open:(folderId:string)=>void){return ()=>{};}
