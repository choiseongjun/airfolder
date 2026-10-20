const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, env = {}, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, URL, process: { env }, require(name) {
    if (name === './public-locale' || name === '@/lib/public-locale') return load('lib/public-locale.ts');
    if (name === './[lang]/make/guides') return load('app/[lang]/make/guides.ts');
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  } });
  return loaded.exports;
}

test('production remains crawlable when SITE_URL is missing', () => {
  const seo = load('lib/seo.ts', { VERCEL_ENV: 'production' });
  assert.equal(seo.publicOrigin(), 'https://memonestia.xyz');
  for (const lang of ['ko', 'en', 'en-ph', 'id']) {
    const metadata = seo.publicMetadata(lang);
    assert.equal(metadata.robots.index, true);
    assert.equal(metadata.alternates.canonical, `https://memonestia.xyz/${lang}`);
    assert.equal(metadata.alternates.languages['x-default'], 'https://memonestia.xyz/en');
    assert.equal(metadata.alternates.languages['en-PH'], 'https://memonestia.xyz/en-ph');
    assert.equal(metadata.alternates.languages['id-ID'], 'https://memonestia.xyz/id');
    assert.equal(metadata.openGraph.images[0].url, `https://memonestia.xyz/brand/og-${lang === "en-ph" ? "en" : lang}.png`);
  }
  const imports = { '@/lib/seo': seo };
  const robots = load('app/robots.ts', {}, imports).default();
  assert.equal(robots.rules.allow, '/');
  assert.equal(robots.rules.disallow, '/api/');
  assert.equal(robots.sitemap, 'https://memonestia.xyz/sitemap.xml');
  const sitemap = load('app/sitemap.ts', {}, imports).default();
  const guides = load('app/[lang]/make/guides.ts').guides;
  assert.equal(sitemap.length, 6 + 2 * (guides.length + 1));
  assert.deepEqual(Array.from(sitemap, item => item.url).sort(), [
    'https://memonestia.xyz/en', 'https://memonestia.xyz/en-ph', 'https://memonestia.xyz/en/hosts', 'https://memonestia.xyz/id',
    'https://memonestia.xyz/ko', 'https://memonestia.xyz/ko/hosts',
    ...['ko', 'en'].flatMap(lang => [
      `https://memonestia.xyz/${lang}/make`,
      ...guides.map(guide => `https://memonestia.xyz/${lang}/make/${guide.slug}`),
    ]),
  ].sort());
});

test('public entry chooses Philippines and Indonesia without overriding explicit preferences', () => {
  const { resolvePublicLocale } = load('lib/public-locale.ts');
  const resolve = (headers = {}, options = {}) => resolvePublicLocale({ headers: new Headers(headers), ...options });
  assert.equal(resolve({ 'x-vercel-ip-country': 'PH' }), 'en-ph');
  assert.equal(resolve({ 'x-vercel-ip-country': 'ID' }), 'id');
  assert.equal(resolve({ 'x-vercel-ip-country': 'KR' }), 'ko');
  assert.equal(resolve({ 'x-vercel-ip-country': 'US', 'accept-language': 'id' }), 'en');
  assert.equal(resolve({ 'x-vercel-ip-country': 'ID' }, { saved: 'en' }), 'en');
  assert.equal(resolve({ 'x-vercel-ip-country': 'PH' }, { saved: 'ko', linked: 'id' }), 'id');
  assert.equal(resolve({ 'accept-language': 'en;q=0.2,id-ID;q=0.9' }), 'id');
  assert.equal(resolve({ 'accept-language': 'fil-PH,en;q=0.5' }), 'en-ph');
  assert.equal(resolve({ 'accept-language': 'en-PH' }), 'en-ph');
  assert.equal(resolve({ 'x-vercel-ip-country': 'XX', 'cf-ipcountry': 'ID' }), 'id');
  assert.equal(resolve({ 'accept-language': 'id;q=0,ko;q=0.8' }), 'ko');
  assert.equal(resolve({ 'accept-language': 'id;q=bogus' }), 'en');
});

test('preview and development cannot inherit production indexing', () => {
  for (const VERCEL_ENV of ['preview', 'development']) {
    const seo = load('lib/seo.ts', { VERCEL_ENV, SITE_URL: 'https://memonestia.xyz' });
    assert.equal(seo.publicOrigin(), undefined);
    assert.equal(seo.publicMetadata('ko').robots.index, false);
    assert.equal(load('app/sitemap.ts', {}, { '@/lib/seo': seo }).default().length, 0);
  }
  assert.equal(load('lib/seo.ts').publicOrigin(), undefined);
});

test('explicit production origins are validated and used consistently', () => {
  assert.equal(load('lib/seo.ts', { VERCEL_ENV: 'production', SITE_URL: 'https://example.com/' }).publicOrigin(), 'https://example.com');
  for (const SITE_URL of ['http://example.com', 'https://localhost', 'https://example.com/path', 'https://example.com?token=secret']) {
    assert.throws(() => load('lib/seo.ts', { VERCEL_ENV: 'production', SITE_URL }).publicOrigin());
  }
});
