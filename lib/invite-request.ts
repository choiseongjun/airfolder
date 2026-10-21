export type InviteRequest = 'photos' | 'birthday';

export function inviteRequest(value: unknown): InviteRequest {
  return value === 'birthday' ? 'birthday' : 'photos';
}

export function requestInviteLink(base: string, request: InviteRequest) {
  const url = new URL(base);
  url.searchParams.set('request', request);
  if (request === 'birthday') url.searchParams.set('next', 'rolling');
  else url.searchParams.delete('next');
  return url.toString();
}

export function inviteRequestMessage(title: string, url: string, request: InviteRequest, ko: boolean) {
  if (request === 'birthday') return ko
    ? `💌 ${title}에 축하 한마디 남겨줘!\n사진이 없어도 괜찮아. 로그인 없이 한 줄이면 돼. 함께 쓴 롤링페이퍼로 남겨둘게.\n${url}`
    : `💌 Leave a birthday wish for ${title}!\nNo photo or sign-in needed. Add a line to our shared birthday card.\n${url}`;
  return ko
    ? `📸 ${title}에서 내가 나온 사진, 여기에 올려줘!\n네 폰에 있는 우리 사진을 한곳에 모으고 싶어. 로그인 없이 사진만 골라 보내면 돼.\n${url}`
    : `📸 Got photos of me from ${title}? Send them here!\nLet's collect our photos in one album. Pick your photos and send, no sign-in needed.\n${url}`;
}
