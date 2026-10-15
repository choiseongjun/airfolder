// Dry run by default. Schedule --execute on the server; never commit credentials.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { deleteRequestedAccount } from './account-deletion-core.mjs';
const env = { ...(existsSync('.env.local') ? parseEnv(readFileSync('.env.local', 'utf8')) : {}), ...process.env };
const db = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15000 });
try {
  await db.connect();
  const jobs = await db.query("SELECT id FROM snaproom.viewers WHERE deletion_requested_at<now()-interval '5 minutes' ORDER BY deletion_requested_at");
  console.log(`Pending account deletions: ${jobs.rowCount}`);
  if (process.argv.includes('--execute') && jobs.rowCount) {
    if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error('Firebase administration credentials required');
    const credential = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (credential.project_id !== env.FIREBASE_PROJECT_ID) throw new Error('Firebase project mismatch');
    const auth = getAuth(initializeApp({ credential: cert(credential) }));
    const store = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } }).storage.from('snaproom-photos');
    let completed = 0;
    for (const job of jobs.rows) {
      try { if (await deleteRequestedAccount(db, store, auth, job.id)) completed++; }
      catch { console.error('A deletion failed; request retained for retry.'); process.exitCode = 1; }
    }
    console.log(`Completed account deletions: ${completed}`);
  }
} catch { console.error('Account deletion worker failed; check server configuration.'); process.exitCode = 1; }
finally { await db.end(); }
