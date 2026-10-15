import 'server-only';
import { pool } from './server';

// Best effort: photo publication must succeed even if the notification provider is unavailable.
// No photo, folder title or sender identity is exposed on the lock screen.
export async function notifySharedPhotos(folderIds: string[], actor: string, recipients: string[] = []) {
  if(process.env.PUSH_ENABLED!=='true'||!folderIds.length)return;
  for(const folderId of [...new Set(folderIds)]){
    const {rows}=await pool().query(`SELECT DISTINCT d.token,d.viewer_id FROM snaproom.push_devices d
      JOIN snaproom.members m ON m.viewer_id=d.viewer_id AND m.folder_id=$1
      JOIN snaproom.sessions s ON s.token_hash=d.session_hash AND s.expires_at>now()
      JOIN snaproom.folders f ON f.id=m.folder_id
      LEFT JOIN snaproom.group_members gm ON gm.group_id=f.group_id AND gm.viewer_id=d.viewer_id
      WHERE snaproom.interaction_allowed($2,d.viewer_id) AND NOT COALESCE(gm.muted,false) AND EXISTS(SELECT 1 FROM snaproom.notifications n LEFT JOIN snaproom.photos p ON p.id=n.photo_id LEFT JOIN snaproom.records r ON r.id=n.record_id WHERE n.viewer_id=d.viewer_id AND n.folder_id=$1 AND n.actor_id=$2 AND n.pushed_at IS NULL AND n.created_at>now()-interval '1 day' AND ((p.id IS NOT NULL AND snaproom.can_view(p.owner_id,p.shared,p.recipients,d.viewer_id)) OR (r.id IS NOT NULL AND snaproom.can_view(r.owner_id,r.shared,r.recipients,d.viewer_id))))
      AND NOT EXISTS(SELECT 1 FROM snaproom.notifications n WHERE n.viewer_id=d.viewer_id AND n.folder_id=$1 AND n.pushed_at>now()-interval '5 minutes')
      AND d.viewer_id<>$2 AND (cardinality($3::uuid[])=0 OR d.viewer_id=ANY($3::uuid[])) AND d.updated_at>now()-interval '90 days'`,[folderId,actor,recipients]);
    for(let i=0;i<rows.length;i+=100){
      const batch=rows.slice(i,i+100);
      const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',...(process.env.EXPO_ACCESS_TOKEN?{Authorization:`Bearer ${process.env.EXPO_ACCESS_TOKEN}`}:{})},body:JSON.stringify(batch.map(d=>({to:d.token,title:'Memonestia',body:'There are new updates in your shared memories.',data:{folderId},channelId:'photos',ttl:3600})))});
      if(!response.ok)throw new Error('PUSH_PROVIDER_ERROR');
      const result=await response.json();
      for(let j=0;j<(result.data?.length||0);j++){
        if(result.data[j].status==='ok')await pool().query('UPDATE snaproom.notifications SET pushed_at=now() WHERE viewer_id=$1 AND folder_id=$2 AND actor_id=$3 AND pushed_at IS NULL',[batch[j].viewer_id,folderId,actor]);
        if(result.data[j].details?.error==='DeviceNotRegistered')await pool().query('DELETE FROM snaproom.push_devices WHERE token=$1',[batch[j].token]);
      }
    }
  }
}
