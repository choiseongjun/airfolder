import 'server-only';
import { Pool, type PoolClient } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { nativeBearer } from './mobile-auth-core';

const globalDb = globalThis as typeof globalThis & { snaproomPool?: Pool };
export function pool() {
  if (!process.env.DATABASE_URL) throw new Error('Server not configured');
  return globalDb.snaproomPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 4, connectionTimeoutMillis: 15000, idleTimeoutMillis: 30000 });
}
export function storage() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error('Storage not configured');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from('snaproom-photos');
}
export async function storageFileLimit() {
  const result=await createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}}).storage.getBucket('snaproom-photos');
  if(result.error)throw new ApiError(503,'STORAGE_UNAVAILABLE');
  return Number(result.data.file_size_limit)||2*1024*1024*1024;
}
export class ApiError extends Error { constructor(public status: number, public code: string) { super(code); } }
export function hash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)) throw new ApiError(400, 'INVALID_ID');
  return value;
}
export function sameOrigin(request: Request) {
  // Native clients have no Origin and use explicit bearer credentials, never browser cookies.
  if (!request.headers.has('origin') && request.headers.has('authorization')) {
    try { nativeBearer(request.headers.get('authorization')); return; } catch { throw new ApiError(401, 'INVALID_NATIVE_TOKEN'); }
  }
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new ApiError(403, 'INVALID_ORIGIN');
}
export async function sessionToken() {
  const authorization = (await headers()).get('authorization');
  if (authorization !== null) {
    try { return nativeBearer(authorization); } catch { throw new ApiError(401, 'INVALID_NATIVE_TOKEN'); }
  }
  const token = (await cookies()).get('snaproom_session')?.value;
  return token && /^[a-f\d]{64}$/.test(token) ? token : undefined;
}
export async function transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await pool().connect();
  try { await db.query('BEGIN'); const result = await work(db); await db.query('COMMIT'); return result; }
  catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}
export async function viewer() {
  const token = await sessionToken();
  if (!token) throw new ApiError(401, 'SESSION_REQUIRED');
  const result = await pool().query('SELECT s.viewer_id FROM snaproom.sessions s JOIN snaproom.viewers v ON v.id=s.viewer_id WHERE s.token_hash=$1 AND s.expires_at>now() AND v.deletion_requested_at IS NULL', [hash(token)]);
  if (!result.rowCount) throw new ApiError(401, 'SESSION_EXPIRED');
  return result.rows[0].viewer_id as string;
}
export async function ensureSession(request: Request) {
  try { return await viewer(); } catch (error) { if (!(error instanceof ApiError) || error.status !== 401) throw error; }
  const id = randomUUID(), token = randomBytes(32).toString('hex');
  await transaction(async db => {
    await db.query('INSERT INTO snaproom.viewers(id) VALUES($1)', [id]);
    await db.query("INSERT INTO snaproom.sessions(token_hash,viewer_id,expires_at) VALUES($1,$2,now()+interval '365 days')", [hash(token), id]);
  });
  (await cookies()).set('snaproom_session', token, { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 31536000 });
  return id;
}
export async function requireMember(folder: string, who: string) {
  const result = await pool().query('SELECT 1 FROM snaproom.members WHERE folder_id=$1 AND viewer_id=$2', [folder, who]);
  if (!result.rowCount) throw new ApiError(404, 'FOLDER_NOT_FOUND');
}
export async function safe(work: () => Promise<Response>) {
  try { return await work(); } catch (error) {
    if (error instanceof ApiError) return Response.json({ error: error.code }, { status: error.status });
    console.error('Snaproom request failed', error instanceof Error ? error.name : 'UnknownError');
    return Response.json({ error: 'SERVER_ERROR' }, { status: 503 });
  }
}
export async function json(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 32768) throw new ApiError(413, 'TOO_LARGE');
  try { const body = await request.json(); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(); return body; } catch { throw new ApiError(400, 'INVALID_JSON'); }
}
