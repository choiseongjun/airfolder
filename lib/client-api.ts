export async function api<T = Record<string, unknown>>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, credentials: 'same-origin', cache: 'no-store', headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'SERVER_ERROR');
  return data as T;
}

let sessionRequest: Promise<{ viewerId: string }> | undefined;
export function initializeSession() {
  return sessionRequest ??= api<{ viewerId: string }>('/api/session', { method: 'POST' }).finally(() => { sessionRequest = undefined; });
}
