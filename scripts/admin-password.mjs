import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const derive = (password, salt) => new Promise((resolve, reject) => {
  scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
});
export function validAdminPassword(password) {
  return typeof password === 'string' && password.length >= 16 && Buffer.byteLength(password, 'utf8') <= 256;
}
export async function hashAdminPassword(password) {
  if (!validAdminPassword(password)) throw new Error('PASSWORD_REQUIREMENTS');
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `scrypt-v1:${salt}:${key.toString('hex')}`;
}
export async function verifyAdminPassword(password, encoded) {
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 256) return false;
  const match = /^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(encoded || '');
  // Also perform the KDF for unknown accounts to avoid a cheap username oracle.
  const key = await derive(password, match?.[1] || '00000000000000000000000000000000');
  return timingSafeEqual(key, Buffer.from(match?.[2] || '0'.repeat(128), 'hex')) && !!match;
}
