import {ApiError,pool,safe,uuid,viewer} from '@/lib/server';
import {storyAccess} from '@/lib/trip-story-server';
export async function GET(request:Request){return safe(async()=>{const q=new URL(request.url).searchParams,folder=uuid(q.get('folderId')),note=uuid(q.get('noteId')),who=await viewer();await storyAccess(folder,who,q.get('token'));
 const r=await pool().query(`SELECT cp.active FROM snaproom.rolling_paper_notes n JOIN snaproom.trip_story_entries e ON e.note_id=n.id AND e.use_profile
  JOIN snaproom.character_profiles cp ON cp.viewer_id=n.owner_id WHERE n.id=$1 AND n.folder_id=$2 AND NOT n.hidden AND snaproom.interaction_allowed(n.owner_id,$3)`,[note,folder,who]);
 if(!r.rows[0]?.active)throw new ApiError(404,'CHARACTER_NOT_FOUND');return new Response(new Uint8Array(r.rows[0].active),{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
});}
