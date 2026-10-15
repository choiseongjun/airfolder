const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals = {}, imports = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require: name => {
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  }, ...globals });
  return loaded.exports;
}
const locale = load('lib/locale.ts');
const resolve = (headers = {}, options = {}) => locale.resolveLocale({ headers: new Headers(headers), ...options });

test('first visits use country before browser language, with English for unsupported countries', () => {
  for (const header of ['x-vercel-ip-country', 'cf-ipcountry']) {
    assert.equal(resolve({ [header]: 'KR', 'accept-language': 'en-US' }), 'ko');
    for (const country of ['US', 'JP', 'DE']) {
      assert.equal(resolve({ [header]: country, 'accept-language': 'ko-KR' }), 'en');
    }
  }
  assert.equal(resolve({ 'cf-ipcountry': ' kr ' }), 'ko');
});

test('explicit URL and saved preferences take priority over automatic detection', () => {
  const headers = { 'x-vercel-ip-country': 'KR', 'accept-language': 'ko' };
  assert.equal(resolve(headers, { saved: 'en' }), 'en');
  assert.equal(resolve(headers, { saved: 'en', linked: 'ko' }), 'ko');
  assert.equal(resolve(headers, { saved: 'ko', linked: 'en' }), 'en');
  assert.equal(resolve(headers, { saved: 'fr', linked: ['en', 'ko'] }), 'ko');
});

test('missing and unknown geolocation use weighted supported browser languages', () => {
  for (const country of ['', 'XX', 'T1', 'ZZ', 'KOR', 'KR,US']) {
    assert.equal(resolve({ 'cf-ipcountry': country, 'accept-language': 'fr-FR,en;q=0.3,ko-KR;q=0.8' }), 'ko');
  }
  assert.equal(resolve({ 'accept-language': 'ko;q=0.2,en-US;q=0.9' }), 'en');
  assert.equal(resolve({ 'accept-language': 'en;q=0,ko;q=0.5' }), 'ko');
  assert.equal(resolve({ 'accept-language': 'ko;q=0,en;q=0.5' }), 'en');
  assert.equal(resolve({ 'accept-language': 'fr,ko;q=0.5,en;q=0.5' }), 'ko');
  assert.equal(resolve({ 'x-vercel-ip-country': 'XX', 'cf-ipcountry': 'KR' }), 'ko');
});

test('invalid or unsupported preferences fall back safely to English', () => {
  for (const value of ['', '*', 'ja-JP,fr-FR', 'ko;q=NaN', 'ko;q=2', 'ko;q=-1', 'ko;q=0']) {
    assert.equal(resolve({ 'accept-language': value }), 'en');
  }
  assert.equal(resolve(), 'en');
});

test('visitor language is resolved separately for each request', () => {
  assert.equal(resolve({ 'cf-ipcountry': 'KR' }), 'ko');
  assert.equal(resolve({ 'cf-ipcountry': 'US' }), 'en');
  assert.equal(resolve({ 'cf-ipcountry': 'KR' }), 'ko');
});

function browser(globals) {
  return load('lib/browser-locale.ts', { window: { location: { protocol: 'https:' } }, ...globals }, { './locale': locale });
}

test('manual language persists in a server-readable cookie even when localStorage is blocked', () => {
  const document = { cookie: '' };
  const api = browser({ document, localStorage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } });
  assert.doesNotThrow(() => api.saveBrowserLocale('ko'));
  assert.equal(api.savedBrowserLocale(), 'ko');
  assert.match(document.cookie, /Path=\/; Max-Age=31536000; SameSite=Lax; Secure$/);
});

test('legacy storage remains readable when cookies are unavailable', () => {
  const values = new Map([['snaproom-language', 'en']]);
  const api = browser({ document: { get cookie() { throw Error('blocked'); }, set cookie(_) { throw Error('blocked'); } },
    localStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) } });
  assert.equal(api.savedBrowserLocale(), 'en');
  api.saveBrowserLocale('ko');
  assert.equal(api.savedBrowserLocale(), 'ko');
});

test('current cookie wins over stale legacy storage; invalid values are ignored', () => {
  assert.equal(browser({ document: { cookie: 'other=ko; snaproom-language=en' }, localStorage: { getItem: () => 'ko' } }).savedBrowserLocale(), 'en');
  assert.equal(browser({ document: { cookie: 'snaproom-language=invalid' }, localStorage: { getItem: () => 'ko' } }).savedBrowserLocale(), 'ko');
  assert.equal(browser({ document: { cookie: '' }, localStorage: { getItem: () => 'fr' } }).savedBrowserLocale(), undefined);
});

test('fully blocked storage cannot crash language selection', () => {
  const api = browser({ document: { get cookie() { throw Error('blocked'); }, set cookie(_) { throw Error('blocked'); } },
    localStorage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } });
  assert.equal(api.savedBrowserLocale(), undefined);
  assert.doesNotThrow(() => api.saveBrowserLocale('ko'));
});
