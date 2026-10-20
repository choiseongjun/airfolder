// Adds clearly labelled, reversible stock-photo sample content to one viewer.
// Run with STITCH_FEED_OWNER_ID set to the viewer returned by /api/feed.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const env = { ...parseEnv(readFileSync('.env.local', 'utf8')), ...process.env };
const owner = env.STITCH_FEED_OWNER_ID;
if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(owner || '')) {
  throw new Error('STITCH_FEED_OWNER_ID must be the current viewer UUID.');
}
const db = new pg.Client({ connectionString: env.DATABASE_URL });
const store = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage.from('snaproom-photos');
const uuid = key => {
  const h = createHash('sha256').update(`stitch-feed-sample-v1:${owner}:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const folder = uuid('album');
const trip = uuid('trip-record');
const daily = uuid('daily-record');
const report = JSON.parse(readFileSync('artifacts/demo-seed-report.json', 'utf8'));
const notes = [
  '바다 보러 가자고 먼저 말해줘서 고마워. 다음에는 일몰까지 보고 오자.',
  '사진 고르면서 다시 여행하는 기분이야. 첫날 빵집도 기억에 남아.',
  '그날 바람이 엄청 불었는데 사진에는 평화롭게 나왔네 😆',
  '다음 여행 후보는 부산! 날짜는 이번 주에 정하기.',
  '운전하느라 고생했어. 휴게소 간식도 완벽했음.',
  '이 사진 색감 너무 좋다. 원본도 앨범에 잘 모아둘게.',
  '카페에서 한참 수다 떨던 게 제일 좋았어.',
  '다음에는 보조 배터리 꼭 챙겨 가기 🔋',
  '같은 풍경도 각자 찍으니까 다르게 보여서 재밌다.',
  '여기 다시 가면 이번엔 천천히 산책하자.',
  '사진 뒷면에 적어 둔 말까지 나중에 같이 읽으면 좋겠다.',
  '여행 끝나고 바로 사진 정리하니까 찾기 쉽네!',
  '세 번째 날 아침 풍경도 잊지 않게 남겨 두기.',
  '우리 다음 추억도 이 앨범에 차곡차곡 모으자.',
  '이날 찍은 사진 중에 이게 내 최애야 💛',
  '빵집 이름 적어 두기. 다음에 또 가고 싶어.',
  '돌아오는 길에 다음 약속 잡은 것도 우리답다.',
  '샘플 메모예요. 실제 크루와 함께 쓰면 더 풍성해져요 ✨',
];
const dayFor = index => index < 8 ? '2026-10-17' : index < 20 ? '2026-10-18' : '2026-10-19';
const destinations = [];

try {
  await db.connect();
  const existing = await db.query('SELECT id FROM snaproom.folders WHERE id=$1 AND owner_id=$2', [folder, owner]);
  if (existing.rowCount) {
    console.log('Sample feed already exists for this viewer.');
  } else {
    const sources = await db.query(
      `SELECT id,object_path,preview_path,mime,size_bytes,original_available,preview_size_bytes
       FROM snaproom.photos WHERE id=ANY($1::uuid[]) AND mime LIKE 'image/%' ORDER BY array_position($1::uuid[],id)`,
      [report.photos.slice(0, 32).map(photo => photo.id)],
    );
    if (sources.rowCount !== 32) throw new Error('Expected 32 existing stock sample photos.');

    // Copy only known, already-seeded stock fixtures; never read the viewer's uploads.
    for (let i = 0; i < sources.rows.length; i++) {
      const source = sources.rows[i];
      const id = uuid(`photo-${i}`);
      const path = `${owner}/${folder}/${id}.jpg`;
      const preview = `${owner}/${folder}/${id}.preview.jpg`;
      destinations.push(path, preview);
      const [originalCopy, previewCopy] = await Promise.all([
        store.copy(source.object_path, path),
        store.copy(source.preview_path || source.object_path, preview),
      ]);
      for (const result of [originalCopy, previewCopy]) {
        if (result.error) throw result.error;
      }
    }

    await db.query('BEGIN');
    try {
      await db.query(
        `INSERT INTO snaproom.folders(id,owner_id,name,description,category,starts_on,ends_on)
         VALUES($1,$2,$3,$4,'여행','2026-10-17','2026-10-19')`,
        [folder, owner, '[샘플] 제주 2박3일 우정여행 🌊', '스티치 메인 화면 미리보기용 샘플 앨범 · stock photos'],
      );
      await db.query('INSERT INTO snaproom.members(folder_id,viewer_id) VALUES($1,$2)', [folder, owner]);

      for (let i = 0; i < sources.rows.length; i++) {
        const source = sources.rows[i];
        const id = uuid(`photo-${i}`);
        const path = `${owner}/${folder}/${id}.jpg`;
        const preview = `${owner}/${folder}/${id}.preview.jpg`;
        const day = dayFor(i);
        await db.query(
          `INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,mime,size_bytes,shared,captured_at,
             preview_path,preview_mime,preview_status,original_available,preview_size_bytes)
           VALUES($1,$2,$3,$4,$5,'image/jpeg',$6,false,$7,$8,'image/jpeg','ready',$9,$10)`,
          [id, folder, owner, `[샘플] 제주 여행 ${String(i + 1).padStart(2, '0')}.jpg`, path,
            source.size_bytes, `${day}T${String(9 + (i % 10)).padStart(2, '0')}:00:00+09:00`, preview,
            source.original_available, source.preview_size_bytes],
        );
      }

      await db.query(
        `INSERT INTO snaproom.records(id,folder_id,owner_id,body,recorded_on,shared,title,created_at)
         VALUES($1,$2,$3,$4,'2026-10-19',false,$5,'2026-10-20T09:00:00+09:00')`,
        [trip, folder, owner,
          '[샘플 기록] 바다와 카페를 천천히 둘러본 제주 2박 3일. 실제 크루 사진과 메모를 올리기 전 화면 미리보기용입니다.',
          '✈️ 2박 3일 낭만 제주 여행기'],
      );
      await db.query(
        `INSERT INTO snaproom.records(id,folder_id,owner_id,body,recorded_on,shared,title,created_at)
         VALUES($1,$2,$3,$4,'2026-10-17',false,$5,'2026-10-17T17:00:00+09:00')`,
        [daily, folder, owner, '[샘플 기록] 여행 첫날, 동네 빵집에서 잠깐 쉬어 갔어요.', '🥐 연남동에서 시작한 여행'],
      );
      await db.query(
        `INSERT INTO snaproom.record_photos(record_id,photo_id,position)
         SELECT $1,p.id,p.position-1 FROM unnest($2::uuid[]) WITH ORDINALITY AS p(id,position)
         JOIN snaproom.photos ON snaproom.photos.id=p.id
         ON CONFLICT DO NOTHING`,
        [trip, Array.from({ length: 28 }, (_, i) => uuid(`photo-${i}`))],
      );
      await db.query(
        `INSERT INTO snaproom.record_photos(record_id,photo_id,position)
         SELECT $1,p.id,p.position-1 FROM unnest($2::uuid[]) WITH ORDINALITY AS p(id,position)
         JOIN snaproom.photos ON snaproom.photos.id=p.id
         ON CONFLICT DO NOTHING`,
        [daily, Array.from({ length: 4 }, (_, i) => uuid(`photo-${28 + i}`))],
      );
      for (let i = 0; i < notes.length; i++) {
        await db.query(
          'INSERT INTO snaproom.comments(id,record_id,owner_id,body,created_at) VALUES($1,$2,$3,$4,now()-($5::int * interval \'1 minute\'))',
          [uuid(`note-${i}`), trip, owner, `[샘플 메모] ${notes[i]}`, notes.length - i],
        );
      }
      await db.query('COMMIT');
      console.log('Created one labelled personal sample album: 32 stock photos, 2 records, 18 sample notes.');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }
} catch (error) {
  if (destinations.length) await store.remove(destinations).catch(() => undefined);
  throw error;
} finally {
  await db.end();
}
