import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
const env = { ...parseEnv(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')), ...process.env };
const db = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15000 });
try {
  await db.connect();
  await db.query('BEGIN');
  await db.query(readFileSync(new URL('../db/001_snaproom.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/002_accounts.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/003_mobile_login.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/004_push.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/005_deletion.sql', import.meta.url), 'utf8'));
  await db.query('COMMIT');
  const storage = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } }).storage;
  const bucket = env.SUPABASE_STORAGE_BUCKET;
  if (bucket !== 'snaproom-photos') throw new Error('Unexpected bucket configuration');
  const existing = await storage.getBucket(bucket);
  if (existing.data?.public) throw new Error('Snaproom bucket must be private');
  if (!existing.data) {
    if (existing.error && !/not found/i.test(existing.error.message) && String(existing.error.status) !== '404') throw new Error('Bucket lookup failed');
    const created = await storage.createBucket(bucket, { public: false, fileSizeLimit: 15 * 1024 * 1024, allowedMimeTypes: ['image/jpeg'] });
    if (created.error) throw new Error('Private bucket creation failed');
  }
  console.log('READY: snaproom schema (8 RLS-protected tables) and private snaproom-photos bucket.');
} catch (error) {
  await db.query('ROLLBACK').catch(() => {});
  console.error('Setup failed:', error.code || error.name, 'Credentials and database details omitted.');
  process.exitCode = 1;
} finally { await db.end(); }
