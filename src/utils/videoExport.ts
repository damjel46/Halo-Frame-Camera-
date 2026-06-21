import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { encode } from '../../modules/my-module/src/MyModule';
import { TripPhoto } from '../types';

export interface ExportOptions {
  photos: TripPhoto[];
  durationPerPhoto: number;  // seconds
  audioPath?: string;
  onProgress?: (progress: number) => void;
}

export type ExportResult =
  | { success: true; outputUri: string }
  | { success: false; error: string };

export async function exportToVideo(options: ExportOptions): Promise<ExportResult> {
  const { photos, durationPerPhoto, audioPath, onProgress } = options;

  if (photos.length === 0) {
    return { success: false, error: '사진이 없습니다.' };
  }
  if (durationPerPhoto <= 0) {
    return { success: false, error: '재생 시간이 올바르지 않습니다.' };
  }

  const outputFile = new File(Paths.cache, `halo_export_${Date.now()}.mp4`);
  const outputPath = outputFile.uri;
  const timingsMs = photos.map(() => Math.round(durationPerPhoto * 1000));
  const photoPaths = photos.map(p => p.uri);

  try {
    await encode({
      photoPaths,
      timings: timingsMs,
      audioPath,
      outputPath,
    });

    onProgress?.(0.9);

    const asset = await MediaLibrary.createAssetAsync(outputPath);
    let album = await MediaLibrary.getAlbumAsync('Halo');
    if (album == null) {
      album = await MediaLibrary.createAlbumAsync('Halo', asset, false);
    } else {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    }

    onProgress?.(1.0);
    return { success: true, outputUri: asset.uri };
  } catch (e: any) {
    return { success: false, error: e?.message ?? '인코딩 중 오류가 발생했습니다.' };
  } finally {
    try { outputFile.delete(); } catch {}
  }
}
