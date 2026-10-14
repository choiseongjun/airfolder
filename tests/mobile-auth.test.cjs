const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(path) {
  const loaded = { exports: {} };
  new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(loaded, loaded.exports, require);
  return loaded.exports;
}
const { nativeBearer, verifierChallenge } = load('lib/mobile-auth-core.ts');
const { folderDates } = load('lib/folder-dates.ts');
test('native auth refuses malformed credentials instead of falling back to a cookie', () => {
  assert.equal(nativeBearer(null), undefined);
  assert.equal(nativeBearer('Bearer snm_' + 'a'.repeat(64)), 'snm_' + 'a'.repeat(64));
  for (const value of ['', 'Basic abc', 'Bearer ' + 'a'.repeat(64), 'Bearer snm_' + 'a'.repeat(63), 'Bearer snm_' + 'a'.repeat(64) + ' ']) assert.throws(() => nativeBearer(value), /INVALID_NATIVE_TOKEN/);
});
test('one-time login challenge is bound to a full random verifier', () => {
  const verifier = 'a'.repeat(64);
  assert.equal(verifierChallenge(verifier), require('node:crypto').createHash('sha256').update(verifier).digest('hex'));
  assert.notEqual(verifierChallenge(verifier), verifierChallenge('b'.repeat(64)));
  for (const value of [null, {}, 'abc', 'g'.repeat(64)]) assert.throws(() => verifierChallenge(value), /INVALID_VERIFIER/);
});
test('folder date ranges reject rollover dates and remain optional for existing web clients', () => {
  assert.deepEqual(folderDates(undefined, undefined), [null, null]);
  assert.deepEqual(folderDates('2028-02-29', '2028-03-01'), ['2028-02-29', '2028-03-01']);
  for (const [start, end] of [['2026-02-29', '2026-03-01'], ['2026-02-01', '2026-01-31'], ['2026-02-01', null], [true, false]]) assert.throws(() => folderDates(start, end), /INVALID_DATE_RANGE/);
});
