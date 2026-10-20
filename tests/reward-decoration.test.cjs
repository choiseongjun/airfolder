const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}) {
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module: mod, exports: mod.exports, require: key => imports[key] });
  return mod.exports;
}
const rewards = load('lib/piece-rewards.ts');
const { parseDecoration } = load('lib/reward-decoration.ts', { './piece-rewards': rewards });
test('decoration allows only earned characters and outfits, including a no-outfit choice', () => {
  const unlocked = ['bear', 'rabbit', 'scarf'];
  assert.equal(parseDecoration({ character: 'rabbit', outfit: 'scarf', phrase: 'thanks' }, unlocked).phrase, 'thanks');
  assert.equal(parseDecoration({ character: 'bear', outfit: '' }, unlocked).outfit, undefined);
  assert.throws(() => parseDecoration({ character: 'fox' }, unlocked), /REWARD_LOCKED/);
  assert.throws(() => parseDecoration({ character: 'bear', outfit: 'camera' }, unlocked), /REWARD_LOCKED/);
  assert.equal(parseDecoration(null, []), null);
});
test('rejects spoofed types, unknown artwork and arbitrary bubble content', () => {
  for (const input of [undefined, [], 'bear', {}, { character: 'scarf' }, { character: 'bear', outfit: 'rabbit' }, { character: 'bear', phrase: '__proto__' }, { character: 'bear', phrase: '<script>' }]) {
    assert.throws(() => parseDecoration(input), /INVALID_DECORATION/);
  }
});
test('snapshot is a clean copy, unaffected by later selection mutations', () => {
  const selected = { character: 'bear', outfit: 'scarf', phrase: 'again', total: 1000 };
  const snapshot = parseDecoration(selected, ['bear', 'scarf']);
  selected.character = 'rabbit';
  assert.equal(snapshot.character, 'bear');
  assert.equal(snapshot.total, undefined);
});
