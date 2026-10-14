import type {PoolClient} from 'pg';
import {pool,ApiError} from './server';
import {ACCOUNT_STORAGE_LIMIT,SERVICE_STORAGE_LIMIT} from './media-limits';

// Reserve room for unfinished previews. Older previews without recorded sizes
// are conservatively counted at the original size (at least 1 MiB).
const charged='size_bytes + COALESCE(preview_size_bytes, CASE WHEN original_available OR preview_path IS NOT NULL THEN greatest(size_bytes,1048576) ELSE 0 END)';
export async function storageUsage(who:string,db:Pick<PoolClient,'query'>=pool()){
 const {rows:[r]}=await db.query(`SELECT COALESCE(sum(${charged}) FILTER(WHERE owner_id=$1),0) AS used,COALESCE(sum(${charged}),0) AS total FROM snaproom.photos`,[who]);
 return {used:Number(r.used),total:Number(r.total)};
}
export async function checkStorageQuota(db:PoolClient,who:string,bytes:number){
 // Serialize admission across accounts so simultaneous uploads cannot exceed
 // either the account cap or the shared service budget.
 await db.query("SELECT pg_advisory_xact_lock(hashtext('media-storage-budget'))");
 const usage=await storageUsage(who,db);
 if(usage.used+bytes>ACCOUNT_STORAGE_LIMIT)throw new ApiError(413,'ACCOUNT_STORAGE_FULL');
 if(usage.total+bytes>SERVICE_STORAGE_LIMIT)throw new ApiError(503,'SERVICE_STORAGE_FULL');
}
