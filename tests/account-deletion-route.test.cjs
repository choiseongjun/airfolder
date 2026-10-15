const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const crypto = require('node:crypto');

function route({ provider = 'apple.com', validIdentity = true, revokeOK = true } = {}) {
  const writes = [], remote = [], cookieChanges = [];
  class ApiError extends Error { constructor(status, code) { super(code); this.status = status; } }
  const db = { query: async (sql, params) => { writes.push({ sql, params }); return { rows: [] }; } };
  const imports = {
    'node:crypto': crypto,
    'next/headers': { cookies: async () => ({ set: (...args) => cookieChanges.push(args) }) },
    '@/lib/server': {
      ApiError, hash: token => crypto.createHash('sha256').update(token).digest('hex'),
      json: r => r.json(), viewer: async () => 'test-viewer',
      pool: () => ({ query: async () => ({ rows: [{ provider, firebase_uid: 'same-user' }] }) }),
      transaction: async fn => fn(db), sameOrigin: () => {},
      safe: async fn => { try { return await fn(); } catch (e) { if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status }); throw e; } },
    },
    '@/lib/firebase-server': { firebaseAdminAuth: () => ({ verifyIdToken: async () => ({ uid: validIdentity ? 'same-user' : 'another-user', provider }) }) },
    '@/lib/auth-core': { identityFromVerifiedClaims: c => c },
  };
  const loaded = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('app/api/account/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', 'fetch', 'process', source)(name => { if (!(name in imports)) throw new Error(name); return imports[name]; }, loaded, loaded.exports, async (url, init) => { remote.push({ url, body: JSON.parse(init.body) }); return { ok: revokeOK }; }, { env: { NEXT_PUBLIC_FIREBASE_API_KEY: 'test-key' } });
  return { remove: body => loaded.exports.DELETE(new Request('https://test.invalid/api/account', { method: 'DELETE', body: JSON.stringify(body) })), writes, remote, cookieChanges };
}
test('Apple deletion requires fresh credentials and refuses a different identity before revoking or deleting', async () => {
  for (const [options, body, status] of [[{}, { confirm: 'DELETE' }, 400], [{ validIdentity: false }, { confirm: 'DELETE', idToken: 'test', appleAccessToken: 'test-access' }, 401]]) {
    const api = route(options); assert.equal((await api.remove(body)).status, status); assert.equal(api.remote.length, 0); assert.equal(api.writes.length, 0);
  }
});
test('failed Apple revocation leaves the account and sessions intact for retry', async () => {
  const api = route({ revokeOK: false }); assert.equal((await api.remove({ confirm: 'DELETE', idToken: 'test', appleAccessToken: 'test-access' })).status, 502);
  assert.equal(api.writes.length, 0); assert.equal(api.cookieChanges.length, 0);
});
test('Apple deletion revokes the token, records a hashed status receipt, and signs out every session', async () => {
  const api = route(); const response = await api.remove({ confirm: 'DELETE', idToken: 'test', appleAccessToken: 'test-access' });
  assert.equal(response.status, 202); const result = await response.json(); assert.match(result.receipt, /^[a-f0-9]{64}$/);
  assert.deepEqual(api.remote[0].body, { providerId: 'apple.com', tokenType: 'ACCESS_TOKEN', token: 'test-access', idToken: 'test' });
  const receipt = api.writes.find(w => w.sql.includes('deletion_receipts'));
  assert.notEqual(receipt.params[0], result.receipt); assert.equal(receipt.params[0], crypto.createHash('sha256').update(result.receipt).digest('hex'));
  assert.ok(api.writes.some(w => w.sql.includes('DELETE FROM snaproom.sessions'))); assert.equal(api.cookieChanges.length, 1);
});
test('Google deletion does not require Apple credentials and confirmation remains mandatory', async () => {
  const api = route({ provider: 'google.com' }); assert.equal((await api.remove({})).status, 400); assert.equal(api.writes.length, 0);
  assert.equal((await api.remove({ confirm: 'DELETE' })).status, 202); assert.equal(api.remote.length, 0);
});
