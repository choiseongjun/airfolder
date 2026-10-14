import { cookies } from 'next/headers';
import { ApiError, json, safe, sameOrigin, transaction, viewer } from '@/lib/server';
export async function DELETE(request:Request){return safe(async()=>{
  sameOrigin(request);const who=await viewer(),body=await json(request);
  if(body.confirm!=='DELETE')throw new ApiError(400,'CONFIRM_DELETION');
  await transaction(async db=>{
    await db.query('UPDATE snaproom.viewers SET deletion_requested_at=COALESCE(deletion_requested_at,now()) WHERE id=$1',[who]);
    await db.query('DELETE FROM snaproom.sessions WHERE viewer_id=$1',[who]);
  });
  (await cookies()).set('snaproom_session','',{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/',maxAge:0});
  return Response.json({status:'deletion_requested'}, {status:202});
});}
