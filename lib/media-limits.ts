export const VIDEO_LIMIT = 50 * 1024 * 1024;
export const IMAGE_LIMIT = 20 * 1024 * 1024;
export const ACCOUNT_STORAGE_LIMIT = 500 * 1024 * 1024;
export const SERVICE_STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;
export const mediaLimit = (mime: string) => mime.startsWith('video/') ? VIDEO_LIMIT : IMAGE_LIMIT;
