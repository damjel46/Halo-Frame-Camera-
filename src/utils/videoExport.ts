import { TripPhoto } from '../types';

export interface ExportOptions {
  photos: TripPhoto[];
  durationPerPhoto: number;
  onProgress?: (progress: number) => void;
}

export type ExportResult =
  | { success: true; outputUri: string }
  | { success: false; error: string };

// TODO: Implement with a native MediaCodec module once ffmpeg-kit Maven
// packages become available or a custom Expo module is written.
export async function exportToVideo(_options: ExportOptions): Promise<ExportResult> {
  return { success: false, error: '영상 내보내기 기능은 준비 중입니다.' };
}
