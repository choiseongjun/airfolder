const { test } = require('node:test');
const assert = require('node:assert/strict');
test('administrator passwords use unique salts and reject wrong or malformed credentials', async () => {
  const { hashAdminPassword, verifyAdminPassword, validAdminPassword } = await import('../scripts/admin-password.mjs');
  const password = 'Synthetic test password 2026!';
  const first = await hashAdminPassword(password), second = await hashAdminPassword(password);
  assert.notEqual(first, second); assert.ok(!first.includes(password));
  assert.equal(await verifyAdminPassword(password, first), true);
  assert.equal(await verifyAdminPassword(password + 'wrong', first), false);
  assert.equal(await verifyAdminPassword(password, undefined), false);
  assert.equal(await verifyAdminPassword(password, 'scrypt-v1:malformed'), false);
  assert.equal(validAdminPassword('short'), false);
  assert.equal(validAdminPassword('한'.repeat(100)), false);
  await assert.rejects(() => hashAdminPassword('short'));
});
