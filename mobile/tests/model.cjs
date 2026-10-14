const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const loaded = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('src/model.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(loaded, loaded.exports);
const { dateRange, eligible } = loaded.exports;
test('date recommendation includes the whole last local day, including DST transitions', () => {
  const old = process.env.TZ; process.env.TZ = 'America/New_York';
  try {
    const range = dateRange('2026-03-08', '2026-03-08');
    assert.equal(range.until - range.from, 23 * 3600000);
    assert.equal(new Date(range.until).getDate(), 9);
    assert.equal(new Date(range.until).getHours(), 0);
    assert.throws(() => dateRange('2026-02-29', '2026-03-01'), /INVALID_DATE/);
    assert.throws(() => dateRange('2026-03-09', '2026-03-08'), /INVALID_DATE/);
  } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; }
});
test('pending photos cannot transfer under another account or server; retries stop at the cap', () => {
  const session = { viewerId: 'a', origin: 'https://one.example' };
  const item = { owner: 'a', origin: session.origin, status: 'pending', attempts: 0, nextAttempt: 0 };
  assert.equal(eligible(item, session, 100), true);
  for (const update of [{owner:'b'}, {origin:'https://two.example'}, {status:'uploaded'}, {attempts:5}, {nextAttempt:101}]) assert.equal(eligible({...item,...update}, session, 100), false);
  assert.equal(eligible({...item,status:'uploading'}, session, 100), true, 'interrupted jobs resume with their original id');
});
