// Explicit operator action. Never prints a password and never overwrites an existing account/file.
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import pg from 'pg';
import { hashAdminPassword } from './admin-password.mjs';

const option = key => { const i = process.argv.indexOf(key); return i < 0 ? undefined : process.argv[i + 1]; };
const username = option('--username')?.toLowerCase(), output = option('--credentials-file');
if (!username || !/^[a-z0-9][a-z0-9._-]{2,63}$/.test(username) || !output) throw new Error('Usage: --username NAME --credentials-file ABSOLUTE_PRIVATE_PATH');
const file = resolve(output), root = resolve('.');
if (file.toLowerCase().startsWith(root.toLowerCase() + '\\') || file.toLowerCase().startsWith(root.toLowerCase() + '/')) throw new Error('Credentials must be stored outside the repository.');
if (existsSync(file)) throw new Error('Credential file already exists; refusing to overwrite.');
const env = { ...(existsSync('.env.local') ? parseEnv(readFileSync('.env.local', 'utf8')) : {}), ...process.env };
const db = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15000 });
let written = false;
try {
  await db.connect();
  await db.query('BEGIN');
  await db.query(readFileSync('db/018_admin.sql', 'utf8'));
  const password = randomBytes(24).toString('base64url');
  const created = await db.query('INSERT INTO snaproom.admin_users(username,password_hash) VALUES($1,$2) RETURNING id', [username, await hashAdminPassword(password)]);
  await db.query("INSERT INTO snaproom.admin_audit(admin_id,action) VALUES($1,'provisioned')", [created.rows[0].id]);
  writeFileSync(file, `Memolumi administrator\n\nLogin path: /admin\nUsername: ${username}\nTemporary password: ${password}\n\nChange this password at first login. It cannot access operational data before that change.\nKeep this file private; remove it after storing your new password in a password manager.\n`, { flag: 'wx', mode: 0o600 });
  written = true;
  await db.query('COMMIT');
  console.log('Administrator created: ' + username + '. Temporary credentials saved to the specified private file; first-login password change required.');
} catch {
  await db.query('ROLLBACK').catch(() => {});
  if (written) unlinkSync(file);
  console.error('Provisioning failed. Existing accounts were not overwritten. Check configuration and the private output path.');
  process.exitCode = 1;
} finally { await db.end(); }
