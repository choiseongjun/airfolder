'use client';
// Kakao's JavaScript key is a public client key; Kakao only accepts it from the domains registered for it.
const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '84b3dfca8ce615e3e99a9219894fdd84';
const SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
const SDK_INTEGRITY = 'sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka';

type KakaoSdk = { isInitialized(): boolean; init(key: string): void; Share: { sendScrap(options: { requestUrl: string }): void } };
let loading: Promise<KakaoSdk> | null = null;
function loadKakao() {
 loading ??= new Promise<KakaoSdk>((resolve, reject) => {
  const existing = (window as unknown as { Kakao?: KakaoSdk }).Kakao;
  if (existing) return resolve(existing);
  const script = document.createElement('script');
  script.src = SDK; script.integrity = SDK_INTEGRITY; script.crossOrigin = 'anonymous'; script.async = true;
  script.onload = () => { const sdk = (window as unknown as { Kakao?: KakaoSdk }).Kakao; if (sdk) resolve(sdk); else reject(new Error('KAKAO_SDK')); };
  script.onerror = () => { loading = null; reject(new Error('KAKAO_SDK')); };
  document.head.appendChild(script);
 });
 return loading;
}

/** Opens KakaoTalk's share picker with the link's own preview card (its Open Graph tags). */
export async function shareToKakao(url: string) {
 const sdk = await loadKakao();
 if (!sdk.isInitialized()) sdk.init(KAKAO_JS_KEY);
 sdk.Share.sendScrap({ requestUrl: url });
}
