import 'server-only';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function firebaseAdminAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || process.env.FIREBASE_AUTH_EMULATOR_HOST || projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) throw new Error('AUTH_NOT_CONFIGURED');
  const name = 'snaproom-auth-' + projectId;
  const app = getApps().find(app => app.name === name) ?? initializeApp({projectId},name);
  return getAuth(app);
}
