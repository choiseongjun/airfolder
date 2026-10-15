import { NextResponse } from 'next/server';
import { requestLocale } from '@/lib/request-locale';

export async function GET(request: Request) {
  const locale = await requestLocale(new URL(request.url).searchParams.get('lang'));
  const response = NextResponse.redirect(new URL(`/${locale}`, request.url));
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
