import { createHash } from 'node:crypto';
export const nativeTokenPattern = /^snm_[a-f0-9]{64}$/;
export const hex64Pattern = /^[a-f0-9]{64}$/;
export function nativeBearer(value: string | null): string | undefined {
  if (value === null) return undefined;
  if (!value.startsWith('Bearer ') || !nativeTokenPattern.test(value.slice(7))) throw new Error('INVALID_NATIVE_TOKEN');
  return value.slice(7);
}
export function verifierChallenge(verifier: unknown): string {
  if (typeof verifier !== 'string' || !hex64Pattern.test(verifier)) throw new Error('INVALID_VERIFIER');
  return createHash('sha256').update(verifier).digest('hex');
}
