import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync } from 'expo-sharing';
import type { Photo, Session } from './model';
export async function exportPhoto(photo: Photo, session: Session) {
  const destination = FileSystem.cacheDirectory + `snaproom-${photo.id}.jpg`;
  try {
    const result = await FileSystem.downloadAsync(session.origin + photo.src, destination, { headers: { Authorization: `Bearer ${session.token}` } });
    if (result.status !== 200) throw new Error('DOWNLOAD_FAILED');
    await shareAsync(result.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg' });
  } finally { await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => {}); }
}
