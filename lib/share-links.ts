import {ApiError,hash,pool,viewer} from './server';
export async function shareIdentity(){
 try{const who=await viewer();const account=await pool().query('SELECT 1 FROM snaproom.accounts WHERE viewer_id=$1',[who]);return account.rowCount?who:null;}
 catch(error){if(error instanceof ApiError&&error.status===401)return null;throw error;}
}
export async function shareAccess(token:string){
 if(!/^[a-f0-9]{64}$/.test(token))return null;
 const result=await pool().query('SELECT access FROM snaproom.share_links WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()',[hash(token)]);
 return result.rows[0]?.access as 'public'|'members'|undefined;
}
export async function linkedPhotos(token:string,id?:string){
 if(!/^[a-f0-9]{64}$/.test(token))return [];
 const who=await shareIdentity();
 const result=await pool().query(`SELECT p.*, r.title AS story_title,r.body AS story_body,r.recorded_on AS story_day FROM snaproom.share_links l
 JOIN snaproom.share_link_photos lp ON lp.link_id=l.id JOIN snaproom.photos p ON p.id=lp.photo_id
 LEFT JOIN snaproom.records r ON r.id=l.record_id
 LEFT JOIN snaproom.record_photos rp_order ON rp_order.record_id=l.record_id AND rp_order.photo_id=p.id
 JOIN snaproom.members m ON m.folder_id=p.folder_id AND m.viewer_id=l.owner_id
 WHERE l.token_hash=$1 AND l.revoked_at IS NULL AND l.expires_at>now()
 AND p.owner_id=l.owner_id AND p.shared
 AND (l.record_id IS NULL OR EXISTS(SELECT 1 FROM snaproom.records r JOIN snaproom.record_photos rp ON rp.record_id=r.id AND rp.photo_id=p.id WHERE r.id=l.record_id AND r.shared AND ((l.access='public' AND cardinality(r.recipients)=0) OR (l.access='members' AND snaproom.can_view(r.owner_id,r.shared,r.recipients,$3)))))
 AND ((l.access='public' AND cardinality(p.recipients)=0) OR
 (l.access='members' AND $3::uuid IS NOT NULL AND EXISTS(SELECT 1 FROM snaproom.members recipient WHERE recipient.folder_id=p.folder_id AND recipient.viewer_id=$3) AND snaproom.can_view(p.owner_id,p.shared,p.recipients,$3)))
 AND ($2::uuid IS NULL OR p.id=$2) ORDER BY rp_order.position NULLS LAST,p.captured_at`,[hash(token),id||null,who]);
 return result.rows;
}
export async function linkedStory(token:string){
 const photos=await linkedPhotos(token);if(!photos.length)return null;
 return photos[0].story_title===null?null:{title:photos[0].story_title,body:photos[0].story_body,recorded_on:photos[0].story_day};
}
