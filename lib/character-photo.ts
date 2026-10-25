// Keep the transmitted body comfortably below the hosting provider's 4.5 MB cap.
export const CHARACTER_INPUT_LIMIT = 20 * 1024 * 1024;
export const CHARACTER_REQUEST_LIMIT = 3 * 1024 * 1024;
export const characterPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];

export async function prepareCharacterPhoto(file: File): Promise<Blob> {
  if (!file.size || file.size > CHARACTER_INPUT_LIMIT) throw Error('PHOTO_TOO_LARGE');
  if (!characterPhotoTypes.includes(file.type)) throw Error('INVALID_PHOTO');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw Error('INVALID_PHOTO'); });
    if (!image.naturalWidth || !image.naturalHeight) throw Error('INVALID_PHOTO');
    const ratio = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw Error('INVALID_PHOTO');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const photo = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('INVALID_PHOTO')), 'image/jpeg', 0.85));
    canvas.width = canvas.height = 0;
    if (photo.size > CHARACTER_REQUEST_LIMIT) throw Error('PHOTO_TOO_LARGE');
    return photo;
  } finally { URL.revokeObjectURL(url); }
}
