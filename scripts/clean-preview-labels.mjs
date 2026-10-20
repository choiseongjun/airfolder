// Remove display-only fixture labels from the exact rows created by our preview seed.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';
const env = { ...parseEnv(readFileSync('.env.local', 'utf8')), ...process.env };
const manifest = JSON.parse(readFileSync('artifacts/preview-crews-report.json', 'utf8'));
const db = new pg.Client({ connectionString: env.DATABASE_URL });
const targets = [
  ['groups', manifest.groups.map(x => x.id), ['name', 'description']],
  ['folders', manifest.albums.map(x => x.id), ['name', 'description']],
  ['photos', manifest.photos.map(x => x.id), ['name']],
  ['records', manifest.records, ['title', 'body']],
  ['comments', manifest.comments, ['body']],
  ['viewers', manifest.fictionalViewers, ['display_name']],
];
await db.connect();
try {
  await db.query('BEGIN');
  const backup = {};
  for (const [table, ids, columns] of targets) {
    const result = await db.query(`SELECT id, ${columns.join(', ')} FROM snaproom.${table} WHERE id = ANY($1::uuid[]) FOR UPDATE`, [ids]);
    if (result.rowCount !== ids.length) throw new Error(`Unexpected fixture count: ${table}`);
    backup[table] = result.rows;
  }
  writeFileSync(`artifacts/preview-label-backup-${Date.now()}.json`, JSON.stringify(backup, null, 2));
  const summary = {};
  for (const [table, ids, columns] of targets) {
    const assignments = columns.map(column => column === 'description'
      ? `${column} = ''`
      : `${column} = regexp_replace(${column}, '^\\[샘플( 기록)?\\]\\s*', '')`);
    const result = await db.query(`UPDATE snaproom.${table} SET ${assignments.join(', ')} WHERE id = ANY($1::uuid[])`, [ids]);
    summary[table] = result.rowCount;
    const checked = await db.query(`SELECT ${columns.join(', ')} FROM snaproom.${table} WHERE id = ANY($1::uuid[])`, [ids]);
    if (checked.rows.some(row => Object.values(row).some(value => typeof value === 'string' && /샘플|화면 확인용|미리보기용/.test(value)))) throw new Error(`Label remains: ${table}`);
  }
  await db.query('COMMIT');
  console.log(JSON.stringify({ updated: summary, labelsRemaining: 0 }));
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  await db.end();
}
