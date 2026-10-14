"use client";
import { getApps, initializeApp } from 'firebase/app';
import { browserPopupRedirectResolver, initializeAuth, inMemoryPersistence, type Auth } from 'firebase/auth';

export const authConfigured = process.env.NEXT_PUBLIC_FIREBASE_AUTH_ENABLED === 'true' && Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
let auth: Auth | undefined;
export function firebaseAuth() {
  if (!authConfigured) throw new Error('AUTH_NOT_CONFIGURED');
  if (auth) return auth;
  const app = getApps().find(app => app.name === 'snaproom-web') ?? initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }, 'snaproom-web');
  return auth = initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
}
