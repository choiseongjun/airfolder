import 'server-only';
import { pool } from './server';

// Best effort: photo publication must succeed even if the notification provider is unavailable.
// No photo, folder title or sender identity is exposed on the lock screen.
export async function notifySharedPhotos(folderIds: string[], actor: string) {
  if(process.env.PUSH_ENABLED!=='true'||!folderIds.length)return;
  for(const folderId of [...new Set(folderIds)]){
    const {rows}=await pool().query(`SELECT DISTINCT d.token FROM snaproom.push_devices d
      JOIN snaproom.members m ON m.viewer_id=d.viewer_id AND m.folder_id=$1
      JOIN snaproom.sessions s ON s.token_hash=d.session_hash AND s.expires_at>now()
      WHERE d.viewer_id<>$2 AND d.updated_at>now()-interval '90 days'`,[folderId,actor]);
    for(let i=0;i<rows.length;i+=100){
      const batch=rows.slice(i,i+100);
      const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',...(process.env.EXPO_ACCESS_TOKEN?{Authorization:`Bearer ${process.env.EXPO_ACCESS_TOKEN}`}:{})},body:JSON.stringify(batch.map(d=>({to:d.token,title:'Memolumi',body:'New photos were shared with you.',data:{folderId},channelId:'photos',ttl:3600})))});
      if(!response.ok)throw new Error('PUSH_PROVIDER_ERROR');
      const result=await response.json();
      for(let j=0;j<(result.data?.length||0);j++){
        if(result.data[j].details?.error==='DeviceNotRegistered')await pool().query('DELETE FROM snaproom.push_devices WHERE token=$1',[batch[j].token]);
      }
    }
  }
}
