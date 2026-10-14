import type { Photo, Session } from './model';
export async function exportPhoto(photo: Photo, _session: Session) {
  const response = await fetch(photo.src, { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('DOWNLOAD_FAILED');
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = photo.name.replace(/\.[^.]+$/, '') + '.jpg'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
