// Defaults to reporting counts. Run --execute only for requests initiated by users.
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
import {initializeApp,cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
const env={...parseEnv(readFileSync('.env.local','utf8')),...process.env};
const db=new pg.Client({connectionString:env.DATABASE_URL});
try{
 await db.connect();
 const jobs=await db.query("SELECT v.id,a.firebase_uid FROM snaproom.viewers v LEFT JOIN snaproom.accounts a ON a.viewer_id=v.id WHERE deletion_requested_at<now()-interval '5 minutes'");
 console.log(`Pending account deletions: ${jobs.rowCount}`);
 if(process.argv.includes('--execute')&&jobs.rowCount){
  if(!env.FIREBASE_SERVICE_ACCOUNT_JSON)throw new Error('Firebase administration credentials required');
  const credential=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if(credential.project_id!==env.FIREBASE_PROJECT_ID)throw new Error('Firebase project mismatch');
  const auth=getAuth(initializeApp({credential:cert(credential)}));
  const store=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}}).storage.from('snaproom-photos');
  for(const job of jobs.rows){
   if(job.firebase_uid)await auth.deleteUser(job.firebase_uid).catch(error=>{if(error.code!=='auth/user-not-found')throw error;});
   // Preserve the group's shared albums when another member can take over.
   await db.query('BEGIN');
   try{
    const owned=await db.query('SELECT id FROM snaproom.groups WHERE owner_id=$1 FOR UPDATE',[job.id]);
    for(const group of owned.rows){
     const next=await db.query('SELECT m.viewer_id FROM snaproom.group_members m JOIN snaproom.viewers v ON v.id=m.viewer_id WHERE m.group_id=$1 AND m.viewer_id<>$2 AND v.deletion_requested_at IS NULL ORDER BY m.joined_at,m.viewer_id LIMIT 1',[group.id,job.id]);
     if(next.rowCount)await db.query('UPDATE snaproom.groups SET owner_id=$2 WHERE id=$1',[group.id,next.rows[0].viewer_id]);
     else await db.query('DELETE FROM snaproom.groups WHERE id=$1',[group.id]);
    }
    await db.query('UPDATE snaproom.folders f SET owner_id=g.owner_id FROM snaproom.groups g WHERE f.group_id=g.id AND f.owner_id=$1',[job.id]);
    await db.query('COMMIT');
   }catch(error){await db.query('ROLLBACK');throw error;}
   const files=await db.query('SELECT object_path,preview_path FROM snaproom.photos WHERE owner_id=$1 OR folder_id IN (SELECT id FROM snaproom.folders WHERE owner_id=$1)',[job.id]);
   for(let i=0;i<files.rows.length;i+=100){const result=await store.remove(files.rows.slice(i,i+100).flatMap(p=>[p.object_path,p.preview_path].filter(Boolean)));if(result.error)throw new Error('Storage cleanup failed; request retained for retry');}
   await db.query('BEGIN');
   try{
    await db.query('DELETE FROM snaproom.photos WHERE owner_id=$1',[job.id]);
    await db.query('DELETE FROM snaproom.invites WHERE created_by=$1',[job.id]);
    await db.query('DELETE FROM snaproom.folders WHERE owner_id=$1',[job.id]);
    await db.query('DELETE FROM snaproom.accounts WHERE viewer_id=$1',[job.id]);
    await db.query('DELETE FROM snaproom.viewers WHERE id=$1',[job.id]);
    await db.query('COMMIT');
   }catch(error){await db.query('ROLLBACK');throw error;}
  }
  console.log('Completed requested account deletions.');
 }
}catch(error){console.error(error instanceof Error?error.name:'Deletion failed');process.exitCode=1;}finally{await db.end();}
