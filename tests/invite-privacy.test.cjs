const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function loadRoute(path, query) {
  const queries = [], signed = [];
  class ApiError extends Error { constructor(status, code) { super(code); this.status = status; } }
  const imports = {
    '@/lib/server': {
      ApiError, sameOrigin() {}, viewer: async () => 'viewer', json: r => r.json(),
      hash: value => value, uuid: value => value,
      pool: () => ({ query: async (sql, params) => { queries.push(sql); return query(sql, params); } }),
      storage: () => ({ createSignedUrl: async path => { signed.push(path); throw new Error('Must not sign hidden content'); } }),
      safe: async fn => { try { return await fn(); } catch (e) { if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status }); throw e; } },
    },
    'next/server': { connection: async () => {} },
    '@/lib/share-links': { linkedPhotos: async () => [] },
    '@/lib/growth': { trackGrowth() {} },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', source)(name => {
    if (!(name in imports)) throw new Error(name);
    return imports[name];
  }, module, module.exports);
  return { ...module.exports, queries, signed };
}
function restricted(sql, alias = '') {
  const prefix = alias ? alias + '.' : '';
  assert.ok(sql.includes(`${prefix}shared`), 'shared-only filter missing');
  assert.ok(sql.includes(`cardinality(${prefix}recipients)=0`), 'selected-recipient exclusion missing');
  assert.ok(sql.includes(`NOT ${prefix}capsule_hold`), 'held capsule exclusion missing');
}
const token = 'a'.repeat(64);
const request = () => new Request('https://test.invalid/api/join/album', { method: 'POST', body: JSON.stringify({ token }) });

test('invite album filters records, loose photos, attachments and record grouping by visibility', async () => {
  const route = loadRoute('app/api/join/album/route.ts', async sql => {
    if (sql.includes('SELECT f.id')) return { rowCount: 1, rows: [{ id: 'folder', theme: 'polaroid', song: '' }] };
    if (sql.includes('WITH items')) return { rows: [{ id: 'record', kind: 'record', captured_time: new Date(), body: 'Shared note' }] };
    return { rows: [] };
  });
  assert.equal((await route.POST(request())).status, 200);
  const items = route.queries.find(sql => sql.includes('WITH items'));
  restricted(items.split('UNION ALL')[0]);
  restricted(items.split('UNION ALL')[1], 'p');
  restricted(items.split('NOT EXISTS')[1], 'r');
  restricted(route.queries.find(sql => sql.includes('SELECT rp.record_id')), 'p');
});
test('invite photo and contributor counts exclude private, selected and held photos', async () => {
  const route = loadRoute('app/api/join/preview/route.ts', async () => ({ rows: [{ id: 'folder', owner: true, kind: 'album' }] }));
  assert.equal((await route.POST(request())).status, 200);
  const countQueries = route.queries[0].match(/\(SELECT count[\s\S]+?\) AS (?:photos|people)/g);
  assert.equal(countQueries.length, 2);
  countQueries.forEach(sql => restricted(sql, 'p'));
});
test('a guessed invite image URL cannot obtain a signed storage URL when visibility denies it', async () => {
  const route = loadRoute('app/api/photos/[id]/content/route.ts', async sql => {
    restricted(sql, 'p');
    assert.ok(sql.includes('i.expires_at>now()'));
    return { rows: [] };
  });
  const response = await route.GET(new Request(`https://test.invalid/api/photos/photo/content?invite=${token}`), { params: Promise.resolve({ id: 'photo' }) });
  assert.equal(response.status, 404);
  assert.equal(route.signed.length, 0);
});
