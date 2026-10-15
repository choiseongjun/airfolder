import 'server-only';
import { cookies, headers } from 'next/headers';
import { languageCookieName, resolveLocale } from './locale';

export async function requestLocale(linked?: unknown) {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    linked,
    saved: cookieStore.get(languageCookieName)?.value,
    headers: requestHeaders,
  });
}
