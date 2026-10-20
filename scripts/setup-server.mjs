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
  await db.query(readFileSync(new URL('../db/006_memories.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/007_webview.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/008_media_audience.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/009_media_processing.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/010_groups.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/011_share_links.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/012_share_access.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/013_member_names.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/014_record_bundles.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/015_provisioned_password_accounts.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/016_safety.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/017_upload_sessions.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/018_admin.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/019_growth_analytics.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/027_rolling_paper.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/028_rolling_paper_photos.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/029_memory_soft_delete.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/030_piece_rewards.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/031_reward_decorations.sql', import.meta.url), 'utf8'));
  await db.query(readFileSync(new URL('../db/032_public_groups.sql', import.meta.url), 'utf8'));
  await db.query('COMMIT');
  const storage = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } }).storage;
  const bucket = env.SUPABASE_STORAGE_BUCKET;
  if (bucket !== 'snaproom-photos') throw new Error('Unexpected bucket configuration');
  const existing = await storage.getBucket(bucket);
  if (existing.data?.public) throw new Error('Snaproom bucket must be private');
  if (!existing.data) {
    if (existing.error && !/not found/i.test(existing.error.message) && String(existing.error.status) !== '404') throw new Error('Bucket lookup failed');
    const created = await storage.createBucket(bucket, { public: false, fileSizeLimit: 2 * 1024 * 1024 * 1024, allowedMimeTypes: ['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif','video/mp4','video/quicktime','video/webm'] });
    if (created.error) throw new Error('Private bucket creation failed');
  }
  const updated = await storage.updateBucket(bucket, { public: false, fileSizeLimit: 2 * 1024 * 1024 * 1024, allowedMimeTypes: ['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif','video/mp4','video/quicktime','video/webm'] });
  if(updated.error) throw new Error('Private media bucket 2 GB update failed: raise Supabase global file size limit first');
  console.log('READY: snaproom schema (RLS-protected tables) and private snaproom-photos bucket.');
} catch (error) {
  await db.query('ROLLBACK').catch(() => {});
  console.error('Setup failed:', error.code || error.name, error.message?.startsWith('Private media bucket')?error.message:'', 'Credentials and database details omitted.');
  process.exitCode = 1;
} finally { await db.end(); }
