// Imports an operator-supplied service-account file without echoing its contents.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createPrivateKey, randomBytes } from 'node:crypto';
const flag = process.argv.indexOf('--service-account-file');
if (flag < 0 || !process.argv[flag + 1]) throw new Error('Provide --service-account-file ABSOLUTE_PRIVATE_JSON_PATH');
try {
  const credential = JSON.parse(readFileSync(process.argv[flag + 1], 'utf8'));
  const original = readFileSync('.env.local', 'utf8'), env = parseEnv(original);
  if (credential.type !== 'service_account' || credential.project_id !== env.FIREBASE_PROJECT_ID || credential.project_id !== env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || typeof credential.client_email !== 'string' || !credential.client_email.endsWith('.iam.gserviceaccount.com')) throw new Error();
  if (createPrivateKey(credential.private_key).asymmetricKeyType !== 'rsa') throw new Error();
  const value = JSON.stringify(credential);
  if (value.includes("'")) throw new Error();
  const lines = original.split(/\r?\n/).filter(line => !/^(?:export\s+)?(?:FIREBASE_SERVICE_ACCOUNT_JSON|CRON_SECRET)=/.test(line));
  const secret = env.CRON_SECRET && env.CRON_SECRET.length >= 32 ? env.CRON_SECRET : randomBytes(32).toString('hex');
  lines.push(`FIREBASE_SERVICE_ACCOUNT_JSON='${value}'`, `CRON_SECRET=${secret}`);
  writeFileSync('.env.local', lines.join('\n') + '\n', { mode: 0o600 });
  console.log('Local deletion configuration saved. Restart the server. Production deployment requires the same server-only variables. No secret values were printed.');
} catch { console.error('Configuration was not imported. Check the file, project and private-key format.'); process.exitCode = 1; }
