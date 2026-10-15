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
    assert.ok(name in imports, `Unexpected import: ${name}`);
    return imports[name];
  } });
  return loaded.exports;
}

test('production remains crawlable when SITE_URL is missing', () => {
  const seo = load('lib/seo.ts', { VERCEL_ENV: 'production' });
  assert.equal(seo.publicOrigin(), 'https://memonestia.xyz');
  for (const lang of ['ko', 'en']) {
    const metadata = seo.publicMetadata(lang);
    assert.equal(metadata.robots.index, true);
    assert.equal(metadata.alternates.canonical, `https://memonestia.xyz/${lang}`);
    assert.equal(metadata.alternates.languages['x-default'], 'https://memonestia.xyz/en');
    assert.equal(metadata.openGraph.images[0].url, 'https://memonestia.xyz/share-card.png');
  }
  const imports = { '@/lib/seo': seo };
  const robots = load('app/robots.ts', {}, imports).default();
  assert.equal(robots.rules.allow, '/');
  assert.equal(robots.rules.disallow, '/api/');
  assert.equal(robots.sitemap, 'https://memonestia.xyz/sitemap.xml');
  const sitemap = load('app/sitemap.ts', {}, imports).default();
  assert.equal(sitemap.length, 4);
  assert.deepEqual(Array.from(sitemap, item => item.url).sort(), [
    'https://memonestia.xyz/en', 'https://memonestia.xyz/en/hosts',
    'https://memonestia.xyz/ko', 'https://memonestia.xyz/ko/hosts',
  ]);
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
