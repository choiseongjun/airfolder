const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { timingSafeEqual } = require('node:crypto');
function endpoint(env) {
  let accessed = false;
  const deniedDependency = () => { accessed = true; throw new Error('Should not access deletion dependencies'); };
  const imports = {
    'node:crypto': { timingSafeEqual },
    'firebase-admin/app': { cert: deniedDependency, getApps: deniedDependency, initializeApp: deniedDependency },
    'firebase-admin/auth': { getAuth: deniedDependency },
    '@/lib/server': { pool: deniedDependency, storage: deniedDependency },
    '@/scripts/account-deletion-core.mjs': { deleteRequestedAccount: deniedDependency },
  };
  const loaded = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('app/api/maintenance/account-deletions/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', 'process', source)(name => imports[name], loaded, loaded.exports, { env });
  return { get: authorization => loaded.exports.GET(new Request('https://test.invalid/api/maintenance/account-deletions', { headers: authorization ? { Authorization: authorization } : {} })), accessed: () => accessed };
}
test('deletion maintenance rejects missing, short, wrong and absent secrets without accessing data', async () => {
  for (const [secret, supplied] of [[undefined, 'Bearer undefined'], ['short', 'Bearer short'], ['s'.repeat(32), undefined], ['s'.repeat(32), 'Bearer ' + 'x'.repeat(32)]]) {
    const route = endpoint({ CRON_SECRET: secret }); assert.equal((await route.get(supplied)).status, 401); assert.equal(route.accessed(), false);
  }
});
test('correct maintenance secret without Firebase credentials fails closed', async () => {
  const secret = 's'.repeat(32), route = endpoint({ CRON_SECRET: secret });
  assert.equal((await route.get('Bearer ' + secret)).status, 503); assert.equal(route.accessed(), false);
});
