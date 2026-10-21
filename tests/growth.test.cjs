const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}, globals = {}) {
  const loaded = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module: loaded, exports: loaded.exports, require: n => { assert.ok(n in imports, n); return imports[n]; }, ...globals });
  return loaded.exports;
}
const events = load('lib/growth-events.ts');
test('analytics drops personal content, tokens, URLs, nested data and arbitrary property values', () => {
  const result = events.growthProperties({ source: 'guest', shared: true, locale: 'ko', media_type: 'image', reason: 'network', email: 'private@example.test', name: 'Private album', token: 'secret', url: '/join/secret', file: { contents: 'photo' }, context_id: 'untrusted', invite_type: 'private-name' });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { source: 'guest', locale: 'ko', media_type: 'image', reason: 'network', shared: true });
  assert.deepEqual(JSON.parse(JSON.stringify(events.growthProperties({ source: 'private text', shared: 'true', reason: 'error with sensitive content' }))), {});
});
test('client events cannot spoof a completed upload, created album or joined invitation', () => {
  for (const e of ['upload_succeeded', 'album_created', 'invite_joined', 'invite_opened']) assert.equal(events.clientEvents.includes(e), false);
});
test('raw upload errors reduce to coarse categories', () => {
  for (const [error, reason] of [['MEDIA_TOO_LARGE','size'],['ACCOUNT_STORAGE_LIMIT','storage'],['INVALID_IMAGE','format'],['SESSION_EXPIRED','permission'],['Failed to fetch','network'],['some sensitive message','other']]) assert.equal(events.uploadFailureReason(error), reason);
});
test('database and PostHog failure do not break the successful product response', async () => {
  let callback, logged = 0;
  const growth = load('lib/growth.ts', { 'server-only': {}, 'next/server': { after: cb => { callback = cb; } }, 'next/headers': { headers: async () => new Headers() }, './server': { hash: s => s, pool: () => ({ query: async () => { throw new Error('DB down'); } }) }, './growth-events': events, './acquisition': load('lib/acquisition.ts') }, { process: { env: {} }, console: { error: () => logged++ }, Headers });
  assert.doesNotThrow(() => growth.trackGrowth({ event: 'upload_succeeded', who: 'test', key: 'test' }));
  await callback(); assert.equal(logged, 1);
});
test('privacy signals prevent persistence and delivery', async () => {
  for (const header of ['dnt', 'sec-gpc']) {
    let callback;
    const growth = load('lib/growth.ts', { 'server-only': {}, 'next/server': { after: cb => { callback = cb; } }, 'next/headers': { headers: async () => new Headers({ [header]: '1' }) }, './server': { hash: s => s, pool: () => { throw new Error('must not access DB'); } }, './growth-events': events, './acquisition': load('lib/acquisition.ts') }, { process: { env: {} }, console: { error: () => assert.fail('must not log an error') }, Headers });
    growth.trackGrowth({ event: 'upload_succeeded', who: 'test', key: 'test' }); await callback();
  }
});
