// Operator-only CLI. Default: queue summary. Explicitly inspect and decide each report.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';
const env = { ...(existsSync('.env.local') ? parseEnv(readFileSync('.env.local', 'utf8')) : {}), ...process.env };
const db = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const value = flag => process.argv[process.argv.indexOf(flag) + 1];
try {
  await db.connect();
  if (!process.argv.includes('--report')) {
    const result = await db.query("SELECT id,created_at,CASE WHEN photo_id IS NOT NULL THEN 'photo' WHEN record_id IS NOT NULL THEN 'record' WHEN comment_id IS NOT NULL THEN 'comment' ELSE 'user' END AS kind FROM snaproom.safety_reports WHERE status='open' ORDER BY created_at LIMIT 100");
    console.log(JSON.stringify(result.rows, null, 2));
  } else {
    const id = value('--report');
    if (!/^[a-f0-9-]{36}$/i.test(id || '')) throw new Error('Invalid report');
    await db.query('BEGIN');
    const result = await db.query(`SELECT s.*,COALESCE(p.owner_id,r.owner_id,c.owner_id,s.target_user_id) AS author,p.object_path,r.title,COALESCE(r.body,c.body,p.name) AS content FROM snaproom.safety_reports s LEFT JOIN snaproom.photos p ON p.id=s.photo_id LEFT JOIN snaproom.records r ON r.id=s.record_id LEFT JOIN snaproom.comments c ON c.id=s.comment_id WHERE s.id=$1 FOR UPDATE OF s`, [id]);
    const report = result.rows[0];
    if (!report) throw new Error('Report not found');
    if (!process.argv.includes('--action')) {
      // Untrusted user content: inspect privately, never publish this output.
      console.log(JSON.stringify({ id: report.id, reason: report.reason, content: report.content, objectPath: report.object_path, status: report.status }, null, 2));
    } else {
      const action = value('--action');
      if (!['hide', 'dismiss', 'suspend'].includes(action)) throw new Error('Invalid action');
      if (action === 'hide' || action === 'suspend') {
        if (report.photo_id) await db.query('UPDATE snaproom.photos SET safety_hidden=true,shared=false WHERE id=$1', [report.photo_id]);
        if (report.record_id) await db.query('UPDATE snaproom.records SET safety_hidden=true,shared=false WHERE id=$1', [report.record_id]);
        if (report.comment_id) await db.query('UPDATE snaproom.comments SET hidden=true WHERE id=$1', [report.comment_id]);
      }
      if (action === 'suspend' || (action === 'hide' && report.target_user_id)) await db.query('UPDATE snaproom.viewers SET suspended_at=now() WHERE id=$1', [report.author]);
      await db.query('UPDATE snaproom.safety_reports SET status=$2,resolved_at=now() WHERE id=$1', [id, action === 'dismiss' ? 'dismissed' : 'hidden']);
      console.log('Report reviewed.');
    }
    await db.query('COMMIT');
  }
} catch { await db.query('ROLLBACK').catch(() => {}); console.error('Safety review failed. Check configuration and arguments.'); process.exitCode = 1; }
finally { await db.end(); }
