// Explicitly synthetic browsing fixtures; no sessions, credentials, or push delivery.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
const env={...parseEnv(readFileSync('.env.local','utf8')),...process.env};
const db=new pg.Client({connectionString:env.DATABASE_URL});await db.connect();
const storage=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY).storage.from('snaproom-photos');
const anchor='0292dfaf-7541-4861-9ae5-fad21eae427e';
const id=k=>{const h=createHash('sha256').update('memolumi-browse-v1:'+k).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const report={groups:[],albums:[],photos:0,records:0,comments:0,reactions:0};
try{
 const {rows:[group]}=await db.query('SELECT owner_id FROM snaproom.groups WHERE id=$1',[anchor]);
 if(!group)throw Error('Sample anchor missing');const owner=group.owner_id;
 const manifest=JSON.parse(readFileSync('artifacts/demo-seed-report.json','utf8'));
 const {rows:sources}=await db.query('SELECT * FROM snaproom.photos WHERE id=ANY($1::uuid[]) ORDER BY id',[manifest.photos.map(p=>p.id)]);
 if(sources.length<40)throw Error('Missing sample sources');
 const sets=[['우리들의 기록',['첫 여행','다음 생일','작년 오늘의 우리','9월 주말 산책']],['오래된 친구들',['제주에서 보낸 사흘','여름 바다','가을 캠핑','함께한 생일']],['가족의 작은 순간',['주말 나들이','지난 추석','우리 집 일상','작년 가을']],['사진 산책 모임',['서울 골목 산책','숲과 빛','9월의 풍경','카페에서 만난 오후']]];
 await db.query('BEGIN');
 for(let g=0;g<sets.length;g++){
  const gid=g===0?anchor:id('group'+g);report.groups.push({id:gid,name:'[샘플] '+sets[g][0]});
  if(g)await db.query('INSERT INTO snaproom.groups(id,owner_id,name,description) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[gid,owner,'[샘플] '+sets[g][0],'둘러보기용 가상 그룹입니다. 사진은 Lorem Picsum 샘플이며 실제 인물·여행 기록이 아닙니다.']);
  await db.query('INSERT INTO snaproom.group_members(group_id,viewer_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[gid,owner]);
  for(let a=0;a<4;a++){
   const name='[샘플] '+sets[g][1][a];
   const saved=existsSync('artifacts/browse-seed-report.json')?JSON.parse(readFileSync('artifacts/browse-seed-report.json','utf8')).albums?.[g*4+a]:null;
   const existing=saved?{rows:[saved]}:g===0?await db.query('SELECT id FROM snaproom.folders WHERE group_id=$1 AND name=$2',[gid,name]):{rows:[]};
   const fid=existing.rows[0]?.id||id(`album${g}-${a}`);
   const date=a===2?'2025-10-14':a===3?'2026-09-20':a===1?'2026-08-15':'2026-10-10';
   await db.query('INSERT INTO snaproom.folders(id,owner_id,name,description,category,group_id,starts_on,ends_on) VALUES($1,$2,$3,$4,$5,$6,$7,$7) ON CONFLICT DO NOTHING',[fid,owner,name,'둘러보기용 가상 기록 · 사진 출처: Lorem Picsum (https://picsum.photos). 실제 장소와 사진은 일치하지 않을 수 있습니다.',g===0||g===1?'여행':'모임',gid,date]);
   report.albums.push({id:fid,groupId:gid,name});
   for(let p=0;p<10;p++){
    const pid=id(`photo${g}-${a}-${p}`),src=sources[(g*13+a*7+p)%sources.length];
    const path=`demo-browse-v1/${pid}.jpg`,preview=`demo-browse-v1/${pid}.preview.jpg`;
    if(!(await db.query('SELECT 1 FROM snaproom.photos WHERE id=$1',[pid])).rowCount){
     for(const [from,to] of [[src.object_path,path],[src.preview_path||src.object_path,preview]]){
      const result=await storage.copy(from,to);if(result.error&&!/already exists|duplicate/i.test(result.error.message))throw result.error;
     }
     await db.query(`INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,mime,size_bytes,shared,captured_at,preview_path,preview_mime,preview_status,original_available) VALUES($1,$2,$3,$4,$5,'image/jpeg',$6,$7,$8,$9,'image/jpeg','ready',$10)`,[pid,fid,owner,`[샘플] ${sets[g][1][a]} ${p+1}.jpg`,path,src.size_bytes,p<8,`${date}T${String(9+p).padStart(2,'0')}:00:00+09:00`,preview,src.original_available]);
    }
    report.photos++;
    if(p<3){await db.query('INSERT INTO snaproom.comments(id,photo_id,owner_id,body) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id('comment'+pid),pid,owner,['[샘플 메모] 이 순간은 다음에도 다시 꺼내 보고 싶다.','[샘플 메모] 함께 찍은 사진은 여기에 모아 두기.','[샘플 메모] 다음 모임 때 이 사진 이야기하기.'][p]]);report.comments++;await db.query('INSERT INTO snaproom.reactions(id,photo_id,owner_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id('reaction'+pid),pid,owner]);report.reactions++;}
   }
   for(let r=0;r<3;r++){await db.query('INSERT INTO snaproom.records(id,folder_id,owner_id,body,recorded_on,shared) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[id(`record${g}-${a}-${r}`),fid,owner,['[샘플 기록] '+sets[g][1][a]+'\n사진을 한곳에 모으니 그날의 순서가 다시 떠오른다. 오래 남겨 두고 싶은 하루.','[샘플 기록] 오늘의 작은 순간\n일정 없이 걷고, 잠시 쉬고, 마음에 드는 장면을 담았다. 다음에도 이렇게 만나기.','[샘플 비공개 메모] 다음에 챙길 것\n보조 배터리, 편한 신발, 그리고 조금 더 여유로운 시간.'][r],date,r<2]);report.records++;}
   console.log(`Prepared ${name}: 10 photos, 3 records`);
  }
 }
 // A clearly labelled playback fixture, separate from the stock photographs.
 const video=readFileSync('artifacts/test-original.mp4');
 const videoId=id('video'),videoPath=`demo-browse-v1/${videoId}.mp4`;
 if(!(await db.query('SELECT 1 FROM snaproom.photos WHERE id=$1',[videoId])).rowCount){
  const uploaded=await storage.upload(videoPath,video,{contentType:'video/mp4',upsert:true});if(uploaded.error)throw uploaded.error;
  await db.query(`INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,mime,size_bytes,shared,captured_at,preview_path,preview_mime,preview_status,original_available) VALUES($1,$2,$3,'[샘플] 영상 재생 테스트 (1초 단색).mp4',$4,'video/mp4',$5,true,'2026-10-10T09:30:00+09:00',$4,'video/mp4','ready',true)`,[videoId,report.albums[0].id,owner,videoPath,video.length]);
 }
 report.videos=1;
 await db.query('COMMIT');
 writeFileSync('artifacts/browse-seed-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({groups:report.groups.length,albums:report.albums.length,photos:report.photos,records:report.records,comments:report.comments,reactions:report.reactions}));
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}
