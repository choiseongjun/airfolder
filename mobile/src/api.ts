import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import type { Locale, Session } from './model';

const key = 'snaproom-session-v1';
export function sessionHeaders(session: Session): Record<string, string> { return { Authorization: `Bearer ${session.token}` }; }
export function serverOrigin() {
  const value = process.env.EXPO_PUBLIC_API_URL;
  if (!value) throw new Error('SERVER_NOT_CONFIGURED');
  const url = new URL(value);
  if ((url.protocol !== 'https:' && !(__DEV__ && url.protocol === 'http:')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('INVALID_SERVER_URL');
  return url.origin;
}
export async function getSession(): Promise<Session | null> {
  const value = await SecureStore.getItemAsync(key); if (!value) return null;
  const session = JSON.parse(value) as Session;
  if (session.origin !== serverOrigin() || !/^snm_[a-f0-9]{64}$/.test(session.token)) return null;
  return session;
}
export async function request<T>(path: string, init: RequestInit = {}, session?: Session): Promise<T> {
  const current = session || await getSession();
  if (!current || current.expiresAt <= Date.now()) throw new Error('SIGN_IN_REQUIRED');
  const response = await fetch(current.origin + path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${current.token}`, ...init.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'SERVER_ERROR');
  return data;
}
export async function connectAccount(locale: Locale, expectedViewerId?: string): Promise<Session | null> {
  const origin = serverOrigin();
  const randomHex = () => Array.from(Crypto.getRandomBytes(32), b => b.toString(16).padStart(2, '0')).join('');
  const verifier = randomHex(), state = randomHex();
  const challenge = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
  const result = await WebBrowser.openAuthSessionAsync(`${origin}/mobile-connect?challenge=${challenge}&state=${state}&lang=${locale}`, 'snaproom://auth');
  if (result.type !== 'success') return null;
  const url = new URL(result.url);
  if (url.protocol !== 'snaproom:' || url.hostname !== 'auth' || url.searchParams.get('state') !== state) throw new Error('INVALID_AUTH_RESPONSE');
  const response = await fetch(`${origin}/api/mobile/exchange`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: url.searchParams.get('code'), verifier }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'SIGN_IN_REQUIRED');
  if (!/^snm_[a-f0-9]{64}$/.test(data.token)) throw new Error('INVALID_AUTH_RESPONSE');
  const session: Session = { ...data, origin };
  if (expectedViewerId && session.viewerId !== expectedViewerId) {
    await request('/api/auth/logout', { method: 'POST' }, session);
    throw new Error('QUEUED_ACCOUNT_MISMATCH');
  }
  await SecureStore.setItemAsync(key, JSON.stringify(session), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  return session;
}
export async function disconnectAccount() {
  // Do not silently lose a valid credential when remote revocation fails.
  const session = await getSession();
  if (session && session.expiresAt > Date.now()) await request('/api/auth/logout', { method: 'POST' }, session);
  await SecureStore.deleteItemAsync(key);
}

export async function forgetSession(){await SecureStore.deleteItemAsync(key);}
