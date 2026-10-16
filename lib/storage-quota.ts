import type {PoolClient} from 'pg';
import {pool,ApiError} from './server';
import {ACCOUNT_STORAGE_LIMIT,SERVICE_STORAGE_LIMIT} from './media-limits';

// Reserve room for unfinished previews. Older previews without recorded sizes
// are conservatively counted at the original size (at least 1 MiB).
const charged='size_bytes + COALESCE(preview_size_bytes, CASE WHEN original_available OR preview_path IS NOT NULL THEN greatest(size_bytes,1048576) ELSE 0 END)';
export async function unlimitedStorage(who:string,db:Pick<PoolClient,'query'>=pool()){
 const r=await db.query('SELECT 1 FROM snaproom.accounts a JOIN snaproom.storage_allowances s ON s.firebase_uid=a.firebase_uid WHERE a.viewer_id=$1 AND s.unlimited',[who]);return !!r.rowCount;
}
export async function storageUsage(who:string,db:Pick<PoolClient,'query'>=pool()){
 const {rows:[r]}=await db.query(`SELECT COALESCE(sum(${charged}) FILTER(WHERE owner_id=$1),0) AS used,COALESCE(sum(${charged}),0) AS total FROM snaproom.photos`,[who]);
 const details=await db.query(`SELECT COALESCE(sum(size_bytes),0) originals,COALESCE(sum(preview_size_bytes),0) previews,COALESCE(sum(CASE WHEN preview_size_bytes IS NULL AND (original_available OR preview_path IS NOT NULL) THEN greatest(size_bytes,1048576) ELSE 0 END),0) reserved,COALESCE(sum(${charged}) FILTER(WHERE f.deleted_at IS NOT NULL),0) trash FROM snaproom.photos p JOIN snaproom.folders f ON f.id=p.folder_id WHERE p.owner_id=$1`,[who]);
 const d=details.rows[0];return {used:Number(r.used),total:Number(r.total),originals:Number(d.originals),previews:Number(d.previews),reserved:Number(d.reserved),trash:Number(d.trash)};
}
export async function checkStorageQuota(db:PoolClient,who:string,bytes:number){
 // Serialize admission across accounts so simultaneous uploads cannot exceed
 // either the account cap or the shared service budget.
 await db.query("SELECT pg_advisory_xact_lock(hashtext('media-storage-budget'))");
 const usage=await storageUsage(who,db);
 if(!await unlimitedStorage(who,db)&&usage.used+bytes>ACCOUNT_STORAGE_LIMIT)throw new ApiError(413,'ACCOUNT_STORAGE_FULL');
 if(usage.total+bytes>SERVICE_STORAGE_LIMIT)throw new ApiError(503,'SERVICE_STORAGE_FULL');
}
