import {connection} from 'next/server';
import {safe,storageFileLimit,viewer} from '@/lib/server';
import {VIDEO_LIMIT,IMAGE_LIMIT,ACCOUNT_STORAGE_LIMIT,SERVICE_STORAGE_LIMIT} from '@/lib/media-limits';
import {storageUsage,unlimitedStorage} from '@/lib/storage-quota';
export async function GET(){
  await connection();
  return safe(async()=>{const who=await viewer();const limit=await storageFileLimit(),usage=await storageUsage(who),unlimited=await unlimitedStorage(who);return Response.json({video:Math.min(limit,VIDEO_LIMIT),image:Math.min(limit,IMAGE_LIMIT),storage:unlimited?null:ACCOUNT_STORAGE_LIMIT,unlimited,used:usage.used,originals:usage.originals,previews:usage.previews,reserved:usage.reserved,trash:usage.trash,remaining:unlimited?Number.MAX_SAFE_INTEGER:Math.max(0,ACCOUNT_STORAGE_LIMIT-usage.used),serviceFull:usage.total>=SERVICE_STORAGE_LIMIT,upgradeRequired:limit<VIDEO_LIMIT},{headers:{'Cache-Control':'private, no-store'}});});
}
