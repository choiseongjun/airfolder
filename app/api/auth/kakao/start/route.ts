import { cookies } from 'next/headers';
import { kakaoAuthorizeUrl, kakaoClientId, KAKAO_STATE_COOKIE, newKakaoState, safeReturnPath } from '@/lib/kakao-auth';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams, returnTo = safeReturnPath(params.get('return'));
  if (!kakaoClientId()) {
    const back = new URL(returnTo, request.url); back.searchParams.set('loginError', 'AUTH_NOT_CONFIGURED');
    return Response.redirect(back, 303);
  }
  // The state ties Kakao's callback to this browser, so a forged callback cannot sign someone in.
  const state = newKakaoState();
  (await cookies()).set(KAKAO_STATE_COOKIE, JSON.stringify({ state, returnTo }), { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'lax', path: '/api/auth/kakao', maxAge: 600 });
  return Response.redirect(kakaoAuthorizeUrl(request, state), 303);
}
