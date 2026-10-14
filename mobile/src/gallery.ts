import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import type { Candidate } from './model';
import { dateRange } from './model';

export async function recommend(start: string, end: string, offset = 0) {
  const range = dateRange(start, end);
  const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo','video']);
  if (!permission.granted) throw new Error('PHOTO_PERMISSION_REQUIRED');
  const assets = await new MediaLibrary.Query()
    .gte(MediaLibrary.AssetField.CREATION_TIME, range.from).lt(MediaLibrary.AssetField.CREATION_TIME, range.until)
    .orderBy({ key: MediaLibrary.AssetField.CREATION_TIME, ascending: false }).offset(offset).limit(60).exe();
  const candidates: Candidate[] = [];
  let unavailable = 0;
  // A bounded page; do not resolve an entire camera roll or request location metadata.
  for (const asset of assets) {
    try { const info = await asset.getInfo(); if(info.mediaType!==MediaLibrary.MediaType.IMAGE&&info.mediaType!==MediaLibrary.MediaType.VIDEO)continue; candidates.push({ mediaType:info.mediaType===MediaLibrary.MediaType.VIDEO?'video':'image',key: `asset:${info.id}`, assetId: info.id, uri: info.uri, name: info.filename, created: info.creationTime ?? Date.now(), width: info.width, height: info.height }); }
    catch { unavailable++; }
  }
  return { candidates, limited: permission.accessPrivileges === 'limited', more: assets.length === 60, nextOffset: offset + assets.length, unavailable };
}
export async function pickPhotos(camera = false): Promise<Candidate[]> {
  if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error('CAMERA_PERMISSION_REQUIRED');
  const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: false }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images','videos'], preferredAssetRepresentationMode:ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,shouldDownloadFromNetwork:true,videoExportPreset:ImagePicker.VideoExportPreset.Passthrough, allowsMultipleSelection: true, selectionLimit: 100, quality: 1, exif: false });
  if (result.canceled) return [];
  return Promise.all(result.assets.map(async asset => {
    let created = Date.now();
    if (asset.assetId) { try { created = await new MediaLibrary.Asset(asset.assetId).getCreationTime() ?? created; } catch { /* Selected-only permission may hide metadata. Use import time. */ } }
    return { mediaType:asset.type==='video'?'video' as const:'image' as const,mime:asset.mimeType,key: asset.assetId ? `asset:${asset.assetId}` : `file:${asset.uri}`, assetId: asset.assetId ?? undefined, uri: asset.uri, name: asset.fileName || 'Photo', created, width: asset.width, height: asset.height };
  }));
}
