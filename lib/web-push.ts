import 'server-only';
import webPush from 'web-push';
import {pool} from './server';
import {validPushEndpoint} from './web-push-validation';

// Server-only, RLS-protected persistent keys. Nothing private is returned to browsers.
export async function webPushKeys(){
 let result=await pool().query('SELECT public_key,private_key FROM snaproom.web_push_keys WHERE id=1');
 if(!result.rowCount){const keys=webPush.generateVAPIDKeys();await pool().query('INSERT INTO snaproom.web_push_keys(id,public_key,private_key) VALUES(1,$1,$2) ON CONFLICT DO NOTHING',[keys.publicKey,keys.privateKey]);result=await pool().query('SELECT public_key,private_key FROM snaproom.web_push_keys WHERE id=1');}
 return result.rows[0] as {public_key:string;private_key:string};
}
export async function notifyWeb(folderIds:string[],actor:string){
 const keys=await webPushKeys();
 for(const folder of new Set(folderIds)){
  const {rows}=await pool().query(`SELECT DISTINCT d.endpoint,d.p256dh,d.auth,d.viewer_id,f.group_id FROM snaproom.web_push_subscriptions d
   JOIN snaproom.sessions s ON s.token_hash=d.session_hash AND s.viewer_id=d.viewer_id AND s.expires_at>now()
   JOIN snaproom.members m ON m.viewer_id=d.viewer_id AND m.folder_id=$1
   JOIN snaproom.folders f ON f.id=m.folder_id AND f.deleted_at IS NULL
   LEFT JOIN snaproom.group_members gm ON gm.group_id=f.group_id AND gm.viewer_id=d.viewer_id
   WHERE d.viewer_id<>$2 AND NOT COALESCE(gm.muted,false) AND snaproom.interaction_allowed($2,d.viewer_id)
   AND EXISTS(SELECT 1 FROM snaproom.notifications n LEFT JOIN snaproom.photos p ON p.id=n.photo_id LEFT JOIN snaproom.records r ON r.id=n.record_id LEFT JOIN snaproom.rolling_paper_notes note ON note.id=n.note_id
    WHERE n.viewer_id=d.viewer_id AND n.folder_id=$1 AND n.actor_id=$2 AND n.web_pushed_at IS NULL AND n.created_at>now()-interval '1 day'
    AND ((p.id IS NOT NULL AND p.deleted_at IS NULL AND NOT p.safety_hidden AND snaproom.can_view(p.owner_id,p.shared,p.recipients,d.viewer_id)) OR (r.id IS NOT NULL AND r.deleted_at IS NULL AND NOT r.safety_hidden AND snaproom.can_view(r.owner_id,r.shared,r.recipients,d.viewer_id)) OR (note.id IS NOT NULL AND NOT note.hidden)))
   AND NOT EXISTS(SELECT 1 FROM snaproom.notifications n WHERE n.viewer_id=d.viewer_id AND n.folder_id=$1 AND n.web_pushed_at>now()-interval '1 minute')`,[folder,actor]);
  for(const d of rows){if(!validPushEndpoint(d.endpoint))continue;
   try{await webPush.sendNotification({endpoint:d.endpoint,keys:{p256dh:d.p256dh,auth:d.auth}},JSON.stringify({title:'Memonestia',body:'새 추억이 도착했어요 · New memories are waiting',url:`/crew/photos?album=${folder}&group=${d.group_id??'personal'}&from=notification`}),{TTL:3600,timeout:8000,vapidDetails:{subject:'mailto:crewcheck.inapp@gmail.com',publicKey:keys.public_key,privateKey:keys.private_key}});
    await pool().query('UPDATE snaproom.notifications SET web_pushed_at=now() WHERE viewer_id=$1 AND folder_id=$2 AND actor_id=$3 AND web_pushed_at IS NULL',[d.viewer_id,folder,actor]);
   }catch(error){const status=(error as {statusCode?:number}).statusCode;if(status===404||status===410)await pool().query('DELETE FROM snaproom.web_push_subscriptions WHERE endpoint=$1',[d.endpoint]);else console.error('Web push delivery unavailable');}
  }
 }
}
