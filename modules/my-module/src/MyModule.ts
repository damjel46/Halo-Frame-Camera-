import { requireNativeModule } from 'expo';

const VideoEncoderNative = requireNativeModule('VideoEncoder');

export interface EncodeOptions {
  photoPaths: string[];
  timings: number[];     // ms per photo
  audioPath?: string;
  outputPath: string;
}

export function encode(options: EncodeOptions): Promise<string> {
  return VideoEncoderNative.encode(options);
}
