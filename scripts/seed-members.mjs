// Fictional guest profiles: no Firebase accounts, login sessions, or push tokens.
import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import pg from 'pg';
const env=parseEnv(readFileSync('.env.local','utf8')),db=new pg.Client({connectionString:env.DATABASE_URL});
const groups=JSON.parse(readFileSync('artifacts/browse-seed-report.json','utf8')).groups;
const names=['김지수','박서연','이하은','정민지','김수진','김도윤','최유진','한소연','윤채원'];
const assignments=[[0,1,2],[0,1,3,6],[4,5],[2,6,7,8]];
const id=n=>{const h=createHash('sha256').update('memolumi-guest-persona:'+n).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
await db.connect();
try{
 await db.query('BEGIN');
 for(let n=0;n<names.length;n++)await db.query('INSERT INTO snaproom.viewers(id,display_name) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name',[id(n),names[n]]);
 for(let g=0;g<groups.length;g++)for(const n of assignments[g])await db.query('INSERT INTO snaproom.group_members(group_id,viewer_id,joined_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[groups[g].id,id(n),`2026-09-${String(2+n).padStart(2,'0')}T10:00:00+09:00`]);
 await db.query('COMMIT');
 const counts=await db.query('SELECT g.name,count(m.viewer_id)::int members FROM snaproom.groups g JOIN snaproom.group_members m ON m.group_id=g.id WHERE g.id=ANY($1::uuid[]) GROUP BY g.id',[groups.map(g=>g.id)]);
 const inherited=await db.query('SELECT count(*)::int missing FROM snaproom.folders f JOIN snaproom.group_members gm ON gm.group_id=f.group_id LEFT JOIN snaproom.members m ON m.folder_id=f.id AND m.viewer_id=gm.viewer_id WHERE f.group_id=ANY($1::uuid[]) AND m.viewer_id IS NULL',[groups.map(g=>g.id)]);
 if(inherited.rows[0].missing)throw Error('Missing album memberships');
 writeFileSync('artifacts/member-seed-report.json',JSON.stringify({fictional:true,users:names.map((name,n)=>({id:id(n),name,guest:true})),groups:counts.rows},null,2));
 console.log(JSON.stringify({groups:counts.rows,missingAlbumMemberships:0}));
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}
