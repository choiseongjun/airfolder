import { cookies } from 'next/headers';
import { hash, pool, safe, sameOrigin, sessionToken } from '@/lib/server';
export async function POST(request: Request) {
  return safe(async()=>{
    sameOrigin(request);
    const jar=await cookies(),token=await sessionToken();
    if(token)await pool().query('DELETE FROM snaproom.sessions WHERE token_hash=$1',[hash(token)]);
    jar.set('snaproom_session','',{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'lax',path:'/',maxAge:0});
    return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  });
}
