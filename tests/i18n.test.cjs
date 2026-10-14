const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const compiled = ts.transpileModule(fs.readFileSync(path.join(root, "app/i18n.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
new Function("module", "exports", compiled)(loaded, loaded.exports);
const { english, translate, formatCount, formatCapturedAt } = loaded.exports;

test("every static translation reference has English copy", () => {
  const page = ts.createSourceFile("page.tsx", fs.readFileSync(path.join(root, "app/(workspace)/page.tsx"), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let references = 0;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(page) === "t" && ts.isStringLiteral(node.arguments[0])) {
      assert.ok(node.arguments[0].text in english, `Missing: ${node.arguments[0].text}`);
      references++;
    }
    ts.forEachChild(node, visit);
  }
  visit(page);
  assert.ok(references > 100, "The audit must cover the app's UI, not an empty source");
  for (const text of Object.values(english)) assert.doesNotMatch(text, /[가-힣]/, "English copy must not leak untranslated Korean");
});

test("counts handle zero, one, many and grouped numbers", () => {
  assert.equal(formatCount("en", 0, "photos"), "0 photos");
  assert.equal(formatCount("en", 1, "selected"), "1 photo selected");
  assert.equal(formatCount("en", 2, "selected"), "2 photos selected");
  assert.equal(formatCount("en", 1000, "rooms"), "1,000 folders");
  assert.equal(formatCount("en", 1, "sharing"), "Who can see this photo?");
  assert.equal(formatCount("ko", 2, "selected"), "2장 선택됨");
  assert.equal(formatCount("ko", 1, "saved"), "1장 저장");
});

test("Korean copy and unknown Unicode content remain intact", () => {
  assert.equal(translate("en", "내 방"), "My folders");
  assert.equal(translate("ko", "내 방"), "내 폴더");
  assert.equal(translate("en", "旅行 à Paris 📷"), "旅行 à Paris 📷");
});

test("capture dates follow the selected locale", () => {
  const instant = Date.UTC(2026, 9, 14, 9, 30);
  assert.match(formatCapturedAt("en", instant), /Oct/);
  assert.match(formatCapturedAt("ko", instant), /2026/);
  assert.notEqual(formatCapturedAt("en", instant), formatCapturedAt("ko", instant));
});
