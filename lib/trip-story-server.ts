import {ApiError,hash,pool,requireMember} from './server';
export async function storyAccess(folder:string,who:string,token:string|null){
 const result=await pool().query('SELECT id,name,owner_id,story_mode,group_id FROM snaproom.folders WHERE id=$1 AND deleted_at IS NULL',[folder]);
 const album=result.rows[0];if(!album?.story_mode)throw new ApiError(404,'STORY_NOT_FOUND');
 if(token){
  if(!/^[a-f\d]{64}$/.test(token))throw new ApiError(404,'INVITE_EXPIRED');
  const invite=await pool().query(`SELECT 1 FROM snaproom.invites WHERE folder_id=$1 AND token_hash=$2 AND expires_at>now()
   UNION ALL SELECT 1 FROM snaproom.group_invites WHERE group_id=$3 AND token_hash=$2 AND expires_at>now()`,[folder,hash(token),album.group_id]);
  if(!invite.rowCount)throw new ApiError(404,'INVITE_EXPIRED');
 }else await requireMember(folder,who);
 return album;
}
export const storyPhotoVisibility="p.deleted_at IS NULL AND NOT p.safety_hidden AND p.shared AND cardinality(p.recipients)=0 AND NOT p.capsule_hold";
