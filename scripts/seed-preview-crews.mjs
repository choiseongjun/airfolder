// Explicitly labelled demo fixtures for the two accounts selected by the owner.
// Account IDs are read from an ignored local file, never committed here.
import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
const env={...parseEnv(readFileSync('.env.local','utf8')),...process.env};
const accounts=JSON.parse(readFileSync('artifacts/sample-crew-accounts.json','utf8'));
const db=new pg.Client({connectionString:env.DATABASE_URL});
const storage=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}}).storage.from('snaproom-photos');
const uuid=key=>{const h=createHash('sha256').update(`preview-crews-v1:${accounts.google}:${key}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const crews=[
 {name:'[샘플] 대학동기',theme:'polaroid',albums:['다시 모인 우리, 가을 MT','주말 카페에서 수다 한 잔','졸업해도 우리는 그대로'],sources:['hiking-friends','cafe-friends','bbq-friends']},
 {name:'[샘플] 주말 여행단',theme:'ticket',albums:['가을 소풍 다녀왔어요','우리의 제주 주말','함께 즐긴 페스티벌'],sources:['spring-picnic','jeju-couple','festival-friends']},
 {name:'[샘플] 생일 준비방',theme:'birthday',albums:['서연이 생일을 축하해','올해도 함께한 생일','사진으로 쓰는 축하 편지'],sources:['family-birthday','cafe-friends','autumn-family']},
];
const people=['[샘플] 서연','[샘플] 지수','[샘플] 하은','[샘플] 민지'];
const lines=['이날 사진 모으니까 또 만나고 싶다 ♡','각자 찍은 사진으로 완성한 우리의 하루'];
const replies=['[샘플] 이 사진은 내 최애야 💛','[샘플] 다음에도 여기서 만나자!','[샘플] 같이 찍은 사진 여기 다 모으니까 좋다','[샘플] 이날 웃느라 정신없었지 ㅋㅋ','[샘플] 우리 다음 모임 날짜도 잡자','[샘플] 사진 보면서 그날 이야기 다시 하는 중'];
const manifest={sample:true,groups:[],albums:[],photos:[],records:[],comments:[],reactions:[],fictionalViewers:people.map((_,i)=>uuid(`person-${i}`))};
await db.connect();
try{
 const found=await db.query('SELECT viewer_id FROM snaproom.accounts WHERE viewer_id=ANY($1::uuid[])',[[accounts.google,accounts.current]]);
 if(found.rowCount!==new Set([accounts.google,accounts.current]).size)throw Error('Selected accounts no longer exist');
 const jobs=[];
 for(let g=0;g<crews.length;g++)for(let a=0;a<3;a++)for(let p=0;p<8;p++){
  const id=uuid(`photo-${g}-${a}-${p}`),folder=uuid(`album-${g}-${a}`),path=`${accounts.google}/${folder}/${id}.jpg`;
  const asset=crews[g].sources[(a+Math.floor(p/3))%3];
  jobs.push({id,folder,path,g,a,p,bytes:readFileSync(`public/explore/album-samples/${asset}.jpg`)});
 }
 const existing=await db.query('SELECT id FROM snaproom.photos WHERE id=ANY($1::uuid[])',[jobs.map(j=>j.id)]);
 const known=new Set(existing.rows.map(r=>r.id));
 for(let offset=0;offset<jobs.length;offset+=4){
  await Promise.all(jobs.slice(offset,offset+4).filter(j=>!known.has(j.id)).map(async j=>{
   const result=await storage.upload(j.path,j.bytes,{contentType:'image/jpeg',upsert:false});
   if(result.error&&!/already exists|duplicate/i.test(result.error.message))throw result.error;
  }));
 }
 await db.query('BEGIN');
 for(let i=0;i<people.length;i++)await db.query('INSERT INTO snaproom.viewers(id,display_name) VALUES($1,$2) ON CONFLICT DO NOTHING',[uuid(`person-${i}`),people[i]]);
 for(let g=0;g<crews.length;g++){
  const gid=uuid(`group-${g}`),crew=crews[g];
  await db.query('INSERT INTO snaproom.groups(id,owner_id,name,description,is_public) VALUES($1,$2,$3,$4,false) ON CONFLICT DO NOTHING',[gid,accounts.google,crew.name,'화면 확인용 가상 크루 · 샘플 사진과 가상 인물의 기록입니다.']);
  manifest.groups.push({id:gid,name:crew.name});
  for(let a=0;a<3;a++){
   const fid=uuid(`album-${g}-${a}`),day=`2026-10-${String(18-a*3-g).padStart(2,'0')}`,name=`[샘플] ${crew.albums[a]}`;
   await db.query('INSERT INTO snaproom.folders(id,owner_id,name,description,category,group_id,starts_on,ends_on,theme) VALUES($1,$2,$3,$4,$5,$6,$7,$7,$8) ON CONFLICT DO NOTHING',[fid,accounts.google,name,'실제 모임의 사진이 아닌 화면 미리보기용 샘플 앨범입니다.',g===1?'여행':g===2?'생일':'모임',gid,day,crew.theme]);
   manifest.albums.push({id:fid,groupId:gid,name});
   for(const j of jobs.filter(j=>j.g===g&&j.a===a)){
    await db.query(`INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,mime,size_bytes,shared,captured_at,preview_path,preview_mime,preview_status,original_available,preview_size_bytes)
     VALUES($1,$2,$3,$4,$5,'image/jpeg',$6,true,$7,$5,'image/jpeg','ready',true,$6) ON CONFLICT DO NOTHING`,
     [j.id,fid,uuid(`person-${Math.floor(j.p/4)}`),`[샘플] ${crew.albums[a]} ${j.p+1}.jpg`,j.path,j.bytes.length,`${day}T${10+j.p}:00:00+09:00`]);
    manifest.photos.push({id:j.id,path:j.path});
   }
   for(let r=0;r<2;r++){
    const rid=uuid(`record-${g}-${a}-${r}`),author=uuid(`person-${r}`);
    await db.query(`INSERT INTO snaproom.records(id,folder_id,owner_id,title,body,recorded_on,shared,created_at)
      VALUES($1,$2,$3,$4,$5,$6,true,$7) ON CONFLICT DO NOTHING`,[rid,fid,author,crew.albums[a],`[샘플 기록] ${lines[r]}`,day,`${day}T${18+r}:30:00+09:00`]);
    manifest.records.push(rid);
    for(let p=0;p<4;p++)await db.query('INSERT INTO snaproom.record_photos(record_id,photo_id,position) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[rid,uuid(`photo-${g}-${a}-${r*4+p}`),p]);
    for(let c=0;c<3;c++){
     const cid=uuid(`comment-${g}-${a}-${r}-${c}`),reaction=uuid(`reaction-${g}-${a}-${r}-${c}`),actor=uuid(`person-${(r+c+1)%4}`);
     await db.query('INSERT INTO snaproom.comments(id,record_id,owner_id,body) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[cid,rid,actor,replies[(r*3+c)%replies.length]]);
     await db.query('INSERT INTO snaproom.reactions(id,record_id,owner_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[reaction,rid,actor]);
     manifest.comments.push(cid);manifest.reactions.push(reaction);
    }
   }
  }
  // Add members only after seeding, so fixture inserts do not generate notifications.
  for(const person of [...new Set([accounts.google,accounts.current,...manifest.fictionalViewers])])await db.query('INSERT INTO snaproom.group_members(group_id,viewer_id,muted) VALUES($1,$2,true) ON CONFLICT DO NOTHING',[gid,person]);
 }
 await db.query('COMMIT');
 const check=await db.query(`SELECT g.name,count(DISTINCT gm.viewer_id)::int members,count(DISTINCT f.id)::int albums,count(DISTINCT p.id)::int photos
 FROM snaproom.groups g JOIN snaproom.group_members gm ON gm.group_id=g.id
 JOIN snaproom.folders f ON f.group_id=g.id JOIN snaproom.photos p ON p.folder_id=f.id
 WHERE g.id=ANY($1::uuid[]) GROUP BY g.id`,[manifest.groups.map(g=>g.id)]);
 writeFileSync('artifacts/preview-crews-report.json',JSON.stringify(manifest,null,2));
 console.log(JSON.stringify({groups:check.rows,records:manifest.records.length,comments:manifest.comments.length,reactions:manifest.reactions.length}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}
