import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync } from 'expo-sharing';
import type { Photo, Session } from './model';
export async function exportPhoto(photo: Photo, session: Session) {
  const temporary = FileSystem.cacheDirectory + `memonestia-${photo.id}.download`;
  let destination=temporary;
  try {
    const result = await FileSystem.downloadAsync(session.origin + '/api/photos/'+photo.id+'/content?download=1', temporary, { headers: { Authorization: `Bearer ${session.token}` } });
    if (result.status !== 200) throw new Error('DOWNLOAD_FAILED');
    const headers=Object.fromEntries(Object.entries(result.headers).map(([k,v])=>[k.toLowerCase(),v]));
    const mime=headers['content-type']?.split(';')[0]||'application/octet-stream';
    const extensions:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif','image/avif':'avif','image/gif':'gif','video/mp4':'mp4','video/quicktime':'mov','video/webm':'webm'};
    destination=FileSystem.cacheDirectory+`memonestia-${photo.id}.${extensions[mime]||'bin'}`;
    await FileSystem.moveAsync({from:temporary,to:destination});
    await shareAsync(destination, { mimeType:mime });
  } finally { await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => {});await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => {}); }
}
