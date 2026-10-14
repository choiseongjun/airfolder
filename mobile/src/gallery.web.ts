import * as ImagePicker from 'expo-image-picker';
import type { Candidate } from './model';
export async function recommend(_start: string, _end: string, _offset = 0): Promise<{ candidates: Candidate[]; limited: boolean; more: boolean; nextOffset: number; unavailable: number }> {
  throw new Error('NATIVE_GALLERY_ONLY');
}
export async function pickPhotos(camera = false): Promise<Candidate[]> {
  const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 100 });
  if (result.canceled) return [];
  return result.assets.slice(0, 100).map(asset => ({ key: `web:${asset.fileName}:${asset.fileSize}:${asset.file?.lastModified ?? asset.uri}`, uri: asset.uri, name: asset.fileName || 'Photo', created: asset.file?.lastModified || Date.now(), width: asset.width, height: asset.height }));
}
