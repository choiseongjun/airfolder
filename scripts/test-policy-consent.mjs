import assert from 'node:assert/strict';

// Only call for disposable identities created by integration tests.
export async function acceptTestTerms(base, cookie) {
  const current = await fetch(`${base}/api/policy`, { headers: { Cookie: cookie } });
  assert.equal(current.status, 200, 'Read terms version for test fixture');
  const { version } = await current.json();
  const accepted = await fetch(`${base}/api/policy`, {
    method: 'POST',
    headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, accepted: true }),
  });
  assert.equal(accepted.status, 200, 'Accept terms for disposable test fixture');
}
