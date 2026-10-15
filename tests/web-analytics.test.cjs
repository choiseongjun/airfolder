const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', 'lib/web-analytics.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function load(navigator) {
  const loaded = { exports: {} };
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, URL, navigator });
  return loaded.exports.sanitizeAnalyticsEvent;
}
const sanitizeAnalyticsEvent = load();

test('page URLs omit query strings and fragments without mutating the original event', () => {
  const event = { type: 'pageview', url: 'https://example.com/mobile-connect?code=private#access_token=private' };
  const sanitized = sanitizeAnalyticsEvent(event);
  assert.equal(sanitized.url, 'https://example.com/mobile-connect');
  assert.equal(sanitized.type, 'pageview');
  assert.equal(event.url, 'https://example.com/mobile-connect?code=private#access_token=private');
});

test('share and invitation paths never send the actual token', () => {
  for (const route of ['s', 'join']) {
    for (const suffix of ['', '/', '/details']) {
      const sanitized = sanitizeAnalyticsEvent({ type: 'pageview', url: `https://example.com/${route}/private-token${suffix}?lang=ko` });
      assert.equal(sanitized.url, `https://example.com/${route}/[token]${suffix}`);
    }
  }
});

test('ordinary language and workspace paths remain useful in analytics', () => {
  for (const route of ['/ko', '/en/hosts', '/', '/start', '/support']) {
    const event = { type: 'event', url: `https://example.com${route}` };
    assert.equal(sanitizeAnalyticsEvent(event).url, event.url);
    assert.equal(sanitizeAnalyticsEvent(event).type, 'event');
  }
});

test('malformed URLs are discarded', () => {
  assert.equal(sanitizeAnalyticsEvent({ type: 'pageview', url: 'invalid-url' }), null);
});

test('browser privacy signals disable analytics events', () => {
  const event = { type: 'pageview', url: 'https://example.com/ko' };
  for (const preferences of [{ doNotTrack: '1' }, { globalPrivacyControl: true }]) {
    assert.equal(load(preferences)(event), null);
  }
  assert.equal(load({ doNotTrack: '0', globalPrivacyControl: false })(event).url, event.url);
});
