const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('app/use-save-consent.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function setup(accepted) {
  const states = [], refs = [], requests = []; let cursor = 0, refCursor = 0;
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'react') return {
      useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; },
      useRef(initial) { const i = refCursor++; return refs[i] ||= { current: initial }; },
      useCallback(fn) { return fn; }, useEffect() {},
    };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === '@/lib/client-api') return { api: async (...args) => { requests.push(args); return { accepted }; } };
    return { default: () => null };
  } });
  return { requests, render() { cursor = 0; refCursor = 0; return exports.useSaveConsent(true); } };
}
test('entering the editor neither requests nor displays consent', () => {
  const h = setup(false);
  assert.equal(h.render().consentGate, null);
  assert.equal(h.requests.length, 0);
});
test('previous acceptance allows saving without a dialog', async () => {
  const h = setup(true);
  assert.equal(await h.render().beforeSave(), true);
  assert.equal(h.render().consentGate, null);
});
for (const allowed of [true, false]) test(`saving waits for explicit ${allowed ? 'acceptance' : 'cancellation'}`, async () => {
  const h = setup(false);
  let settled = false;
  const saving = h.render().beforeSave().then(result => { settled = true; return result; });
  await new Promise(setImmediate);
  assert.equal(settled, false);
  const gate = h.render().consentGate;
  gate.props[allowed ? 'onAccepted' : 'onCancel']();
  assert.equal(await saving, allowed);
  assert.equal(h.render().consentGate, null);
  assert.deepEqual(h.requests, [['/api/policy']]);
});
