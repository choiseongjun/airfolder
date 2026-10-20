const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}) {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module: mod, exports: mod.exports, require: key => imports[key], Response });
  return mod.exports;
}
const core = load('lib/piece-rewards.ts');
test('24 distinct rewards, six per category; no unlocks without uploads', () => {
  assert.equal(new Set(core.REWARDS.map(r => r.id)).size, 24);
  for (const kind of ['character', 'outfit', 'badge', 'card']) assert.equal(core.REWARDS.filter(r => r.kind === kind).length, 6);
  assert.equal(core.unlockedRewards(0).length, 0);
});
test('every reward unlocks at its exact threshold, never before', () => {
  for (const reward of core.REWARDS) {
    assert.ok(!core.unlockedRewards(reward.pieces - 1).some(r => r.id === reward.id));
    assert.ok(core.unlockedRewards(reward.pieces).some(r => r.id === reward.id));
  }
});
test('saved equipment is validated by both type and eligibility', () => {
  const equipped = core.validLoadout(30, { character: 'panda', outfit: 'cream', badge: 'collector', card: 'gold' });
  assert.equal(equipped.character, 'bear');
  assert.equal(equipped.outfit, 'leaf');
  assert.equal(equipped.badge, 'collector');
  assert.equal(equipped.card, 'cream');
  assert.equal(Object.keys(core.validLoadout(0, { character: 'bear' })).length, 0);
});
test('past month rewards persist when the calendar advances and selected friend stays selected', () => {
  const months = [{ month: '2026-09', pieces: 60 }, { month: '2026-10', pieces: 0 }];
  const state = core.rewardState(months, '2026-10', { character: 'cat' });
  assert.equal(state.total, 60);
  assert.equal(state.equipped.character, 'cat');
  assert.ok(state.unlocked.includes('cream'));
  assert.equal(core.growthStage(4).level, 1);
  assert.equal(core.growthStage(5).level, 2);
  assert.equal(core.growthStage(25).level, 3);
  assert.equal(core.growthStage(100).level, 4);
});
function routeHarness({ member = true, pieces = 5 } = {}) {
  const writes = [];
  class ApiError extends Error { constructor(status, code) { super(code); this.status = status; } }
  const server = {
    ApiError,
    viewer: async () => 'viewer',
    sameOrigin: request => { if (request.headers.get('origin') !== 'https://example.test') throw new ApiError(403, 'INVALID_ORIGIN'); },
    json: request => request.json(),
    uuid: value => { if (!/^[a-f0-9-]{36}$/.test(value)) throw new ApiError(400, 'INVALID_ID'); return value; },
    safe: async work => { try { return await work(); } catch (error) { return Response.json({ error: error.message }, { status: error.status ?? 500 }); } },
    transaction: async work => work({ query: async (sql, params) => {
      if (sql.includes('group_members')) return { rowCount: member ? 1 : 0, rows: [] };
      if (sql.includes('SELECT to_char(month')) return { rows: [{ month: '2026-10', pieces }] };
      if (sql.includes('SELECT to_char(now()')) return { rows: [{ month: '2026-10' }] };
      if (sql.includes('SELECT equipment')) return { rows: [] };
      writes.push({ sql, params }); return { rows: [] };
    } }),
  };
  return { route: load('app/api/piece-rewards/route.ts', { '@/lib/server': server, '@/lib/piece-rewards': core }), writes };
}
const request = body => new Request('https://example.test/api/piece-rewards', {
  method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/json' }, body: JSON.stringify(body),
});
test('non-members cannot sync a crew collection', async () => {
  const { route, writes } = routeHarness({ member: false });
  assert.equal((await route.POST(request({ action: 'sync', group: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }))).status, 404);
  assert.equal(writes.length, 0);
});
test('forged counts cannot equip a locked reward', async () => {
  const { route, writes } = routeHarness();
  const result = await route.POST(request({ action: 'equip', reward: 'panda', total: 10000, unlocked: ['panda'] }));
  assert.equal(result.status, 400);
  assert.ok(!writes.some(write => write.sql.includes('INSERT INTO snaproom.piece_reward_loadouts')));
});
test('earned choice is persisted, with account and space scope', async () => {
  const { route, writes } = routeHarness({ pieces: 60 });
  const result = await route.POST(request({ action: 'equip', reward: 'cat' }));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).equipped.character, 'cat');
  const write = writes.find(write => write.sql.includes('INSERT INTO snaproom.piece_reward_loadouts'));
  assert.equal(write.params[0], 'viewer');
  assert.equal(write.params[1], 'personal');
  assert.equal(JSON.parse(write.params[2]).character, 'cat');
});
test('cross-origin sync is rejected before touching the ledger', async () => {
  const { route, writes } = routeHarness();
  const result = await route.POST(new Request('https://example.test/api/piece-rewards', {
    method: 'POST', headers: { origin: 'https://elsewhere.test' }, body: JSON.stringify({ action: 'sync' }),
  }));
  assert.equal(result.status, 403);
  assert.equal(writes.length, 0);
});
