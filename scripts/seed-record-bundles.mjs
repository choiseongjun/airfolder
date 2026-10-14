import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import pg from 'pg';
const env=parseEnv(readFileSync('.env.local','utf8'));
const db=new pg.Client({connectionString:env.DATABASE_URL});await db.connect();
const uuid=k=>{const h=createHash('sha256').update('persona26-v1:'+k).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
try{await db.query('BEGIN');for(let n=0;n<12;n++){for(let r=0;r<4;r++){const rid=uuid(`record${n}-${r}`);const title=['처음 만난 풍경','함께 보낸 시간','다음에도 우리 같이','나만의 메모'][r];await db.query("UPDATE snaproom.records SET title=$2 WHERE id=$1 AND title=''",[rid,title]);const start=[0,6,12,16][r],end=[6,12,16,20][r];for(let p=start;p<end;p++)await db.query('INSERT INTO snaproom.record_photos(record_id,photo_id,position) SELECT r.id,p.id,$3 FROM snaproom.records r JOIN snaproom.photos p ON p.folder_id=r.folder_id AND p.owner_id=r.owner_id WHERE r.id=$1 AND p.id=$2 ON CONFLICT DO NOTHING',[rid,uuid(`photo${n}-${p}`),p-start]);}}await db.query('COMMIT');console.log('48 existing stories bundled with 240 existing photos; visibility preserved.');}finally{await db.end();}
