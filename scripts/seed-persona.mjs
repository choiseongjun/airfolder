// Fictional 26-year-old user's browsing scenario. No real identity or messages.
import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
const env=parseEnv(readFileSync('.env.local','utf8'));
const db=new pg.Client({connectionString:env.DATABASE_URL});
const store=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY).storage.from('snaproom-photos');
const previous=JSON.parse(readFileSync('artifacts/browse-seed-report.json','utf8'));
const legacy=JSON.parse(readFileSync('artifacts/demo-seed-report.json','utf8'));
const uuid=k=>{const h=createHash('sha256').update('persona26-v1:'+k).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const albums=[
 [0,'우리 첫 강릉 여행','2026-10-11','여행','금요일 퇴근하고 출발. 바다 보고 커피 마시고, 늦잠까지 완벽했던 주말.','첫날은 체크인만 하고 쉬려고 했는데 결국 밤바다까지 보고 왔다. 생각보다 추워서 편의점에서 따뜻한 차를 샀다.','아침 일찍 일어난 보람이 있었다. 사람이 별로 없어서 한참 앉아 있다가 왔다.','다음에는 숙소를 하루 더 잡자. 마지막 날이 너무 아쉬웠어.'],
 [0,'제주, 셋이서 사흘','2026-09-19','여행','운전은 번갈아, 음악은 각자 세 곡씩. 우리의 짧은 여름 연장전.','비 예보 때문에 걱정했는데 오후에는 해가 났다. 일정을 바꿔서 바다부터 간 게 정말 잘한 선택.','예약해 둔 저녁 먹고 숙소에서 사진을 같이 골랐다. 같은 풍경도 셋이 찍으니 전부 달라서 재밌다.','다음 여행 후보는 부산이랑 타이베이. 일단 날짜부터 맞추기.'],
 [0,'작년 오늘도 바다','2025-10-14','여행','사진을 보니까 그날 들었던 노래까지 생각난다.','돌아오는 길에 사진 보내준다고 하고 한참 뒤에야 정리했다. 이번에는 한곳에 모아 두기로.','여행 계획표에는 없던 산책이 제일 기억에 남는다. 다음에도 빈 시간을 조금 남겨 두고 싶다.','벌써 일 년이네. 같은 계절에 다시 가도 좋겠다.'],
 [1,'스물여섯 생일 저녁','2026-09-06','모임','늦게 도착한 주인공과 먼저 켜진 초. 그래도 올해도 같이!','퇴근하고 바로 갔는데 다들 먼저 와 있었다. 케이크 고른 얘기 듣다가 웃어서 초를 두 번 켰다.','선물에 적힌 편지는 집에 와서 다시 읽었다. 작은 말들이 오래 남는다.','단체 사진 원본은 여기 두기. 마음에 드는 걸로 가져가!'],
 [1,'시험 끝나고 만나던 그 멤버','2026-08-22','모임','이제는 퇴근 시간을 맞추지만, 만나면 여전히 똑같은 우리.','각자 회사 얘기를 하다 보니 주문한 음식이 거의 식었다. 대학 때 얘기는 매번 하는데도 재밌다.','다음 모임은 한 달 전에 잡자는 약속. 날짜 투표는 이번 주 안에 끝내자.','사진 정리하다가 예전 단체 사진도 찾았다. 다음에 같이 보자.'],
 [1,'한강에서 보낸 토요일','2026-10-10','모임','돗자리 하나 펴 놓고 해 질 때까지.','생각보다 바람이 많이 불어서 가져간 가디건을 잘 입었다. 간식은 역시 조금씩 나눠 가져오는 게 좋다.','집에 갈 때가 되니 하늘이 더 예뻐져서 십 분만 더 있다가 가기를 세 번 했다.','다음엔 휴대용 조명도 챙겨 갈게.'],
 [2,'엄마랑 하루 데이트','2026-09-27','개인','밥 먹고 걷고, 좋아하는 빵을 하나씩 골랐다.','엄마가 사진은 됐다더니 찍어 준 걸 보면서 제일 오래 골랐다. 마음에 드는 건 따로 보내 드렸다.','오랜만에 둘이 천천히 이야기했다. 특별한 일정이 없어도 이렇게 만나야겠다.','다음에는 엄마가 가 보고 싶다고 한 곳으로.'],
 [2,'추석 지나고 가족 나들이','2026-09-26','모임','다 같이 나오는 사진 한 장 남기기가 이렇게 어렵다.','출발하기 전부터 점심 메뉴를 정했다. 결국 처음 얘기한 곳으로 가서 다들 웃었다.','아빠가 찍은 사진에는 풍경이 훨씬 많다. 각자 찍은 걸 모으니까 하루가 더 길게 보인다.','가족 사진은 인화해서 다음에 가져가기.'],
 [2,'집에서 쉬는 일요일','2026-10-04','개인','빨래하고 식물에 물 주고, 밀린 사진을 정리했다.','주말에 아무 약속이 없어서 오랜만에 늦잠을 잤다. 해야 할 일을 조금씩 끝내니 마음이 가벼워졌다.','저녁은 냉장고에 있는 재료로 간단하게. 내일 도시락까지 챙겨 놓았다.','이런 날도 나중에 기억하고 싶어서 남겨 두기.'],
 [3,'연남동 오후 산책','2026-10-12','개인','저장해 둔 곳은 하나만 가고, 나머지는 발길 닿는 대로.','일찍 만나서 골목을 한 바퀴 걸었다. 가 보고 싶던 곳은 자리가 없었지만 근처에서 괜찮은 곳을 찾았다.','오랜만에 카메라를 꺼냈다. 마음에 드는 장면 몇 개만 남겨도 충분하다.','사진은 저녁에 천천히 골라서 올릴게.'],
 [3,'9월의 주말들','2026-09-13','개인','크게 특별하지 않아도, 그냥 지나치고 싶지 않은 장면들.','이번 달에는 멀리 나가지 않고 동네를 많이 걸었다. 매번 지나가던 길에서도 처음 보는 게 있다.','자주 만나는 친구와는 사진을 덜 찍게 된다. 이번에는 같이 나온 사진도 꼭 남기기로 했다.','다음 달에도 주말마다 한 번은 산책하기.'],
 [3,'가을 빛 모으기','2026-10-13','개인','퇴근길이 조금 달라 보이는 계절.','해가 짧아져서 조금만 늦어도 어두워진다. 오늘은 한 정거장 먼저 내려 걸었다.','같은 장소에서 찍은 사진을 모아 보니 계절이 바뀌는 게 보인다. 이 앨범은 겨울까지 이어 가려고 한다.','다음에는 아침 빛도 담아 보고 싶다.'],
];
const report={persona:'Fictional woman, age 26; no real-person identity',albums:[],photos:0,records:0,comments:0,source:'Lorem Picsum; existing development stock photographs, not depictions of the described real events'};
await db.connect();
try{
 const {rows:[anchor]}=await db.query('SELECT owner_id FROM snaproom.groups WHERE id=$1',[previous.groups[0].id]);if(!anchor)throw Error('Missing owner');
 const owner=anchor.owner_id;
 const {rows:sources}=await db.query('SELECT * FROM snaproom.photos WHERE id=ANY($1::uuid[]) ORDER BY id',[legacy.photos.map(p=>p.id)]);
 const replies=['이 장면은 꼭 남겨 두고 싶었어.','다음에 갈 때 여기 다시 들르자.','사진 고르다 보니 시간이 훌쩍 갔네.','원본 필요하면 여기서 받아 가면 돼.','이날 생각보다 많이 걸었더라.','다 같이 나온 사진도 더 올려 둘게.'];
 for(let n=0;n<albums.length;n++){
  const [g,name,date,category,description,...notes]=albums[n],fid=uuid('album'+n),gid=previous.groups[g].id;
  const pending=[];
  for(let p=0;p<20;p++){
   const pid=uuid(`photo${n}-${p}`),src=sources[(n*11+p)%sources.length];
   if((await db.query('SELECT 1 FROM snaproom.photos WHERE id=$1',[pid])).rowCount)continue;
   pending.push({pid,src,p,path:`persona26-v1/${pid}.jpg`,preview:`persona26-v1/${pid}.preview.jpg`});
  }
  for(let offset=0;offset<pending.length;offset+=5)await Promise.all(pending.slice(offset,offset+5).map(async x=>{
   for(const [from,to] of [[x.src.object_path,x.path],[x.src.preview_path||x.src.object_path,x.preview]]){
    const result=await store.copy(from,to);if(result.error&&!/already exists|duplicate/i.test(result.error.message))throw result.error;
   }
  }));
  await db.query('BEGIN');
  await db.query('INSERT INTO snaproom.folders(id,owner_id,name,description,category,group_id,starts_on,ends_on,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$7,now()) ON CONFLICT DO NOTHING',[fid,owner,name,description,category,gid,date]);
  for(const x of pending)await db.query(`INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,mime,size_bytes,shared,captured_at,preview_path,preview_mime,preview_status,original_available) VALUES($1,$2,$3,$4,$5,'image/jpeg',$6,$7,$8,$9,'image/jpeg','ready',$10) ON CONFLICT DO NOTHING`,[x.pid,fid,owner,`${name} ${String(x.p+1).padStart(2,'0')}.jpg`,x.path,x.src.size_bytes,x.p<16,`${date}T${String(9+Math.floor(x.p/2)).padStart(2,'0')}:${x.p%2?'30':'00'}:00+09:00`,x.preview,x.src.original_available]);
  for(let r=0;r<4;r++)await db.query('INSERT INTO snaproom.records(id,folder_id,owner_id,body,recorded_on,shared) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[uuid(`record${n}-${r}`),fid,owner,r===3?'다음에 챙길 것\n사진은 미루지 말고 정리하기. 보조 배터리 충전해 두기. 일정 사이에 쉬는 시간 남겨 두기.':notes[r],date,r<3]);
  for(let c=0;c<6;c++){
   await db.query('INSERT INTO snaproom.comments(id,photo_id,owner_id,body) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[uuid(`comment${n}-${c}`),uuid(`photo${n}-${c}`),owner,replies[(n+c)%replies.length]]);
   await db.query('INSERT INTO snaproom.reactions(id,photo_id,owner_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[uuid(`like${n}-${c}`),uuid(`photo${n}-${c}`),owner]);
  }
  await db.query('COMMIT');report.albums.push({id:fid,groupId:gid,name});report.photos+=20;report.records+=4;report.comments+=6;
  writeFileSync('artifacts/persona-seed-report.json',JSON.stringify(report,null,2));console.log(`${name}: 20 photos, 4 records`);
 }
 console.log(JSON.stringify({albums:report.albums.length,photos:report.photos,records:report.records,comments:report.comments}));
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}
