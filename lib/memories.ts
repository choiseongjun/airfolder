import type { PoolClient } from 'pg';
import { ApiError, uuid } from './server';
export function textBody(value: unknown, max: number) {
 if(typeof value!=='string'||!value.trim()||value.trim().length>max) throw new ApiError(400,'INVALID_TEXT');
 return value.trim();
}
export function recordDate(value: unknown) {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value||value>'9999-12-31'||value<'1900-01-01') throw new ApiError(400,'INVALID_DATE');
 return value;
}
export function targetSpec(kind: unknown, value: unknown) {
 if(kind!=='photo'&&kind!=='record') throw new ApiError(400,'INVALID_TARGET');
 return {kind,id:uuid(value),table:kind==='photo'?'photos':'records',column:kind==='photo'?'photo_id':'record_id'};
}
export async function targetAccess(db: PoolClient, who: string, kind: unknown, id: unknown) {
 const target=targetSpec(kind,id);
 // Serialize interactions with visibility changes and deletes. Access is always checked at the parent.
 const result=await db.query(`SELECT t.*,f.owner_id AS manager FROM snaproom.${target.table} t JOIN snaproom.folders f ON f.id=t.folder_id JOIN snaproom.members m ON m.folder_id=t.folder_id AND m.viewer_id=$2 WHERE t.id=$1 AND snaproom.can_view(t.owner_id,t.shared,t.recipients,$2) FOR UPDATE OF t`,[target.id,who]);
 if(!result.rowCount) throw new ApiError(404,'NOT_FOUND');
 return {...target,...result.rows[0]};
}
export async function limitWrites(db: PoolClient,who: string) {
 await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['memories-write:'+who]);
 const result=await db.query(`SELECT (SELECT count(*) FROM snaproom.comments WHERE owner_id=$1 AND created_at>now()-interval '1 minute')+(SELECT count(*) FROM snaproom.records WHERE owner_id=$1 AND created_at>now()-interval '1 minute') AS count`,[who]);
 if(Number(result.rows[0].count)>=20)throw new ApiError(429,'RATE_LIMITED');
}
