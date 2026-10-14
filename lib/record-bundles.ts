import type {PoolClient} from 'pg';
import {ApiError,uuid} from './server';
export function photoIds(value:unknown):string[]|undefined{
 if(value===undefined)return undefined;
 if(!Array.isArray(value)||value.length>200)throw new ApiError(400,'INVALID_PHOTOS');
 const ids=value.map(uuid);if(new Set(ids).size!==ids.length)throw new ApiError(400,'DUPLICATE_PHOTO');return ids;
}
export async function attachPhotos(db:PoolClient,record:string,folder:string,who:string,ids:string[]|undefined){
 if(ids===undefined)return;
 if(ids.length){
  const valid=await db.query('SELECT id FROM snaproom.photos WHERE id=ANY($1::uuid[]) AND folder_id=$2 AND owner_id=$3 ORDER BY id FOR UPDATE',[ids,folder,who]);
  if(valid.rowCount!==ids.length)throw new ApiError(403,'INVALID_PHOTO_OWNER');
  const occupied=await db.query('SELECT 1 FROM snaproom.record_photos WHERE photo_id=ANY($1::uuid[]) AND record_id<>$2',[ids,record]);
  if(occupied.rowCount)throw new ApiError(409,'PHOTO_ALREADY_IN_RECORD');
 }
 await db.query('DELETE FROM snaproom.record_photos WHERE record_id=$1',[record]);
 await db.query('INSERT INTO snaproom.record_photos(record_id,photo_id,position) SELECT $1,id,ordinality-1 FROM unnest($2::uuid[]) WITH ORDINALITY AS photos(id,ordinality)',[record,ids]);
}
