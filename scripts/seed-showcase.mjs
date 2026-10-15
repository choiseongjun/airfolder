// Dedicated fictional showcase fixtures. Never selects arbitrary user uploads.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import pg from 'pg';
import sharp from 'sharp';
import {createClient} from '@supabase/supabase-js';
const env={...parseEnv(readFileSync('.env.local','utf8')),...process.env};
const db=new pg.Pool({connectionString:env.DATABASE_URL,max:4});
const store=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY).storage.from('snaproom-photos');
const uuid=k=>{const h=createHash('sha256').update('showcase-202610:'+k).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const groups=[['우리의 주말','Our weekends'],['오래된 친구들','Old friends'],['가족의 계절','Family seasons'],['작은 순간 수집가','Little moments']];
const titles=[['바다를 만나러','Days by the sea'],['느리게 걷는 여행','A slow escape'],['숲에서 보낸 주말','A weekend in the woods'],['노을이 머문 자리','Chasing sunset'],['아무 계획 없는 하루','A day without plans'],['다음 계절에도 함께','Together next season'],['오랜만이라 더 반가워','Together again'],['우리의 가을 소풍','An autumn picnic'],['생일을 기억하는 방법','A birthday to keep'],['같이 걷던 그 거리','The streets we walked'],['사진을 모으던 밤','An evening of memories'],['열두 달의 우리','Our year together'],['엄마와 나의 산책','A walk with Mom'],['가족의 작은 여행','A little family trip'],['봄을 기다리는 마음','Waiting for spring'],['햇살 좋은 일요일','A sunny Sunday'],['오래된 사진을 펼치면','Opening old photographs'],['함께라서 좋은 날','Better together'],['빛을 따라 걷기','Following the light'],['커피 한 잔의 여유','A quiet coffee break'],['나만의 작은 휴가','My little holiday'],['좋아하는 색을 모아서','Collecting colors'],['오늘의 풍경 기록','Scenes from today'],['다시 펼쳐볼 하루','A day to revisit']];
const notes=[['일정을 조금 비워 두니 더 많은 장면이 보였다. 마음에 드는 순간들을 한곳에 모아 둔다.','Leaving room in the day helped us notice the little things. Here are the moments worth keeping.'],['같은 시간을 각자의 시선으로 남겼다. 사진을 같이 보며 그날의 이야기를 하나씩 더한다.','The same day, seen through different eyes. Every photo brings another little story.'],['돌아오는 길에 벌써 다음 약속을 잡았다. 다음 앨범도 이 사람들과 함께 만들고 싶다.','We were already planning the next outing on the way home. Another album with the same people.']];
const result={groups:groups.map((names,i)=>({id:uuid('group'+i),names})),albums:[],photoCount:0,source:'Lorem Picsum / Unsplash',fictional:true};
try{
 const manifest=JSON.parse(readFileSync('artifacts/demo-seed-report.json','utf8'));
 const {rows:sources}=await db.query("SELECT * FROM snaproom.photos WHERE id=ANY($1::uuid[]) AND mime LIKE 'image/%' ORDER BY id",[manifest.photos.map(p=>p.id)]);
 if(sources.length<24)throw Error('Known stock fixtures missing');
 const selected=sources.slice(0,48);
 for(let i=0;i<selected.length;i++){
  const dest=`public/explore/photo-${i}.jpg`;if(existsSync(dest))continue;
  const file=await store.download(selected[i].preview_path||selected[i].object_path);if(file.error)throw file.error;
  await sharp(Buffer.from(await file.data.arrayBuffer())).rotate().resize({width:1400,height:1400,fit:'inside',withoutEnlargement:true}).jpeg({quality:80}).toFile(dest);
 }
 const owner=uuid('owner');await db.query('INSERT INTO snaproom.viewers(id) VALUES($1) ON CONFLICT DO NOTHING',[owner]);
 for(let g=0;g<4;g++){
  await db.query('INSERT INTO snaproom.groups(id,owner_id,name,description) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[uuid('group'+g),owner,groups[g][0],'Curated fictional showcase; stock photography.']);
  await db.query('INSERT INTO snaproom.group_members(group_id,viewer_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[uuid('group'+g),owner]);
 }
 for(let a=0;a<24;a++){
  const folder=uuid('album'+a),group=Math.floor(a/6),date=`2026-${String(10-Math.floor(a/4)).padStart(2,'0')}-${String(14-a%4*3).padStart(2,'0')}`;
  await db.query('INSERT INTO snaproom.folders(id,owner_id,group_id,name,description,category,starts_on,ends_on) VALUES($1,$2,$3,$4,$5,$6,$7,$7) ON CONFLICT DO NOTHING',[folder,owner,uuid('group'+group),titles[a][0],notes[a%3][0],group===0?'여행':group===3?'개인':'모임',date]);
  const album={id:folder,group,names:titles[a],date,note:notes[a%3],photos:[],records:notes};
  const jobs=[];
  for(let p=0;p<12;p++){
   const sourceIndex=(a*7+p)%selected.length,source=selected[sourceIndex],id=uuid(`photo${a}-${p}`),path=`showcase-202610/${id}.jpg`,preview=`showcase-202610/${id}.preview.jpg`;
   album.photos.push({id,src:`/explore/photo-${sourceIndex}.jpg`,caption:[`${titles[a][0]} · ${p+1}`,`${titles[a][1]} · ${p+1}`]});
   jobs.push(async()=>{
    if((await db.query('SELECT 1 FROM snaproom.photos WHERE id=$1',[id])).rowCount)return;
    for(const[from,to]of [[source.object_path,path],[source.preview_path||source.object_path,preview]]){const copied=await store.copy(from,to);if(copied.error&&!/duplicate|already exists/i.test(copied.error.message))throw copied.error;}
    await db.query("INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,mime,size_bytes,shared,captured_at,preview_path,preview_mime,preview_status,original_available,preview_size_bytes) VALUES($1,$2,$3,$4,$5,'image/jpeg',$6,true,$7,$8,'image/jpeg','ready',$9,$10) ON CONFLICT DO NOTHING",[id,folder,owner,`${titles[a][0]} ${p+1}.jpg`,path,source.size_bytes,`${date}T${String(9+p).padStart(2,'0')}:00:00Z`,preview,source.original_available,source.preview_size_bytes]);
   });
  }
  for(let i=0;i<jobs.length;i+=4)await Promise.all(jobs.slice(i,i+4).map(fn=>fn()));
  for(let r=0;r<3;r++)await db.query('INSERT INTO snaproom.records(id,folder_id,owner_id,body,recorded_on,shared,title) VALUES($1,$2,$3,$4,$5,true,$6) ON CONFLICT DO NOTHING',[uuid(`record${a}-${r}`),folder,owner,notes[r][0],date,['그날의 첫 장면','함께 남긴 이야기','다음에 또 만나'][r]]);
  result.albums.push(album);result.photoCount+=12;console.log(`Prepared album ${a+1}/24`);
 }
 writeFileSync('app/explore/catalog.json',JSON.stringify(result,null,2));
 writeFileSync('artifacts/showcase-seed-report.json',JSON.stringify({owner,groups:4,albums:24,photos:288,records:72,uniqueStockPhotos:selected.length,fictional:true},null,2));
 console.log('READY: 4 groups, 24 albums, 288 photos, 72 records');
}finally{await db.end();}
