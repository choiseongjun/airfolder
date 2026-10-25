export type PhotoRequestState = { creationId: string; name: string; folderId?: string; styled?: boolean; token?: string };
type RequestApi = <T>(url: string, options: RequestInit) => Promise<T>;

/** Keep progress after partial failures; retries must reuse the same album. */
export async function createPhotoRequest(api: RequestApi, state: PhotoRequestState, attemptId: string) {
  if (!state.folderId) {
    const result = await api<{ id: string }>('/api/folders', { method: 'POST', body: JSON.stringify({
      name: state.name, category: '여행', source: 'organizer', creationId: state.creationId,
      flow: 'photo_request', attempt_id: attemptId,
    }) });
    state.folderId = result.id;
  }
  if (!state.styled) {
    await api('/api/folders', { method: 'PUT', body: JSON.stringify({ action: 'style', id: state.folderId, theme: 'ticket' }) });
    state.styled = true;
  }
  if (!state.token) {
    const result = await api<{ token: string }>('/api/invites', { method: 'POST', body: JSON.stringify({
      folderId: state.folderId, flow: 'photo_request', attempt_id: attemptId,
    }) });
    state.token = result.token;
  }
  return { folderId: state.folderId, token: state.token };
}

export function photoRequestMessage(name: string, link: string) {
  return `${name} 사진 여기 모으자 📷\n네 폰에 있는 우리 사진, 내가 나온 사진도 골라서 보내줘!\n앱 설치·회원가입 없이 고른 사진만 보낼 수 있어.\n${link}`;
}
