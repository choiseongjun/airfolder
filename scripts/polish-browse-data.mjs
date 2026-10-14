import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import pg from 'pg';
const env=parseEnv(readFileSync('.env.local','utf8'));
const db=new pg.Client({connectionString:env.DATABASE_URL});
const report=JSON.parse(readFileSync('artifacts/browse-seed-report.json','utf8'));
const legacy=JSON.parse(readFileSync('artifacts/demo-seed-report.json','utf8'));
const id=k=>{const h=createHash('sha256').update('memolumi-browse-v1:'+k).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const descriptions=['함께 떠난 날부터, 다음 약속까지.','오랜만에 만나도 늘 어제 본 것 같은 우리.','크고 작은 우리 가족의 하루를 모아요.','걷다가 마음에 들어온 장면들.'];
const moments=['일찍 출발한 덕분에 조용한 아침을 만났다. 서두르지 않고 천천히 둘러본 하루.','좋아하는 음악을 틀고 한참을 달렸다. 돌아오는 길에는 다음 약속도 잡았다.','다시 보니 그날의 공기까지 생각난다. 같은 자리에서 올해도 한 장 남기고 싶다.','걷다가 쉬고 싶은 곳에서 쉬었다. 계획이 없어서 더 좋았던 오후.'];
const comments=['이 사진 색감 좋다. 오래 두고 보고 싶어.','다음에 갈 때도 여기 들르자.','오늘 사진은 여기에 모아 두기!','이때가 제일 좋았어.','사진 보니까 또 가고 싶다.','이 장면은 꼭 남겨 두자.'];
await db.connect();
try{
 await db.query('BEGIN');
 for(let g=0;g<report.groups.length;g++){
  const group=report.groups[g];group.name=group.name.replace('[샘플] ','');
  await db.query('UPDATE snaproom.groups SET name=$2,description=$3 WHERE id=$1',[group.id,group.name,descriptions[g]]);
 }
 const albums=[...report.albums,...legacy.folders];
 for(let n=0;n<albums.length;n++){
  const album=albums[n];album.name=album.name.replace('[샘플] ','');
  if(album.name==='다음 생일')album.name='함께 보낸 생일';
  await db.query('UPDATE snaproom.folders SET name=$2,description=$3 WHERE id=$1',[album.id,album.name,['다시 꺼내 보고 싶은 순간들.','각자의 시선으로 남긴 그날의 기록.','사진과 이야기를 함께 모아 두는 곳.','우리의 평범하고 소중한 하루.'][n%4]]);
 }
 // Restrict edits to exact fixture IDs; user-created content is never rewritten.
 const photoIds=[...legacy.photos.map(p=>p.id)];
 for(let g=0;g<4;g++)for(let a=0;a<4;a++){
  const album=report.albums[g*4+a];
  for(let p=0;p<10;p++){
   const pid=id(`photo${g}-${a}-${p}`);photoIds.push(pid);
   await db.query('UPDATE snaproom.photos SET name=$2 WHERE id=$1',[pid,`${album.name} ${String(p+1).padStart(2,'0')}.jpg`]);
   if(p<3)await db.query('UPDATE snaproom.comments SET body=$2 WHERE id=$1',[id('comment'+pid),comments[(g+a+p)%comments.length]]);
  }
  for(let r=0;r<3;r++)await db.query('UPDATE snaproom.records SET body=$2 WHERE id=$1',[id(`record${g}-${a}-${r}`),[
   `${album.name}\n${moments[(g+a)%moments.length]}`,
   `기억해 두고 싶은 것\n${['해 질 무렵의 빛이 참 좋았다. 마지막에 찍은 사진들을 특히 좋아한다.','사진을 정리하다 보니 놓친 장면이 보여서 반갑다. 다음에는 함께 나온 사진도 더 찍어야겠다.','바쁜 일정 사이에 이렇게 시간을 내길 잘했다. 다음에도 부담 없이 만나기로.','오래 걷고 나서 마신 커피 한 잔. 별일 없던 시간이 가장 오래 기억에 남는다.'][(g+a)%4]}`,
   '다음에 챙길 것\n보조 배터리와 편한 신발. 돌아오는 일정은 조금 더 여유롭게 잡기.'
  ][r]]);
 }
 await db.query("UPDATE snaproom.photos SET name=replace(name,'[샘플] ','') WHERE id=ANY($1::uuid[])",[legacy.photos.map(p=>p.id)]);
 await db.query("UPDATE snaproom.photos SET name='영상 재생 확인 (1초).mp4',shared=false WHERE id=$1",[id('video')]);
 await db.query('COMMIT');
 writeFileSync('artifacts/browse-seed-report.json',JSON.stringify(report,null,2));
 writeFileSync('artifacts/browse-photo-attribution.json',JSON.stringify({source:'Lorem Picsum',url:'https://picsum.photos',note:'Development browsing fixtures, not real personal memories. Stock photographs reused across albums.',photoIds},null,2));
 console.log(JSON.stringify({groups:report.groups.length,albums:albums.length,photos:photoIds.length,records:48,comments:48}));
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}
