export type Locale = 'en' | 'ko';
export type Session = { token: string; viewerId: string; expiresAt: number; origin: string };
export type Folder = { id: string; name: string; description: string; members: number; mine: boolean; count: number; startDate?: string | null; endDate?: string | null };
export type Photo = { id: string; roomId: string; name: string; created: number; src: string; mine: boolean; shared: boolean };
export type Workspace = { viewerId: string; account: { name: string; email: string | null; provider: string } | null; rooms: Folder[]; photos: Photo[] };
export type Candidate = { key: string; uri: string; name: string; created: number; assetId?: string; width?: number; height?: number };
export type QueueItem = { id: string; owner: string; origin: string; folderId: string; assetKey: string; name: string; created: number; file: string; status: 'pending' | 'uploading' | 'failed' | 'uploaded'; attempts: number; nextAttempt: number; error?: string };
export function dateRange(start: string, end: string) {
  function parse(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_DATE');
    const [y, m, d] = value.split('-').map(Number); const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) throw new Error('INVALID_DATE');
    return date;
  }
  const from = parse(start), until = parse(end);
  if (until < from) throw new Error('INVALID_DATE');
  until.setDate(until.getDate() + 1);
  return { from: from.getTime(), until: until.getTime() };
}
export function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function eligible(item: QueueItem, session: Session, now = Date.now()) {
  return item.owner === session.viewerId && item.origin === session.origin && item.status !== 'uploaded' && item.attempts < 5 && item.nextAttempt <= now;
}
