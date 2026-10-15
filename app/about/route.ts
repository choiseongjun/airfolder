import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { publicLanguageCookie, resolvePublicLocale } from '@/lib/public-locale';
import { languageCookieName } from '@/lib/locale';

export async function GET(request: Request) {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = resolvePublicLocale({ linked: new URL(request.url).searchParams.get('lang'), saved: cookieStore.get(publicLanguageCookie)?.value ?? cookieStore.get(languageCookieName)?.value, headers: requestHeaders });
  const response = NextResponse.redirect(new URL(`/${locale}`, request.url));
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
