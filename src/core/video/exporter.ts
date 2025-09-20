/** Export videos from series or layout. Default: H.264 in MKV container. */
export interface VideoOptions {
  target: "series" | "layout";
  codec: "h264" | "av1" | "vp9";
  container: "mkv" | "mp4" | "webm";
  fps: number;
  width?: number;
  height?: number;
  quality?: number;
  includeOverlays: boolean;
  includeAnnotations: boolean;
  allowPHIOverlays: false;
}

export async function exportVideo(
  _frames: ImageData[],
  _options: VideoOptions,
): Promise<Uint8Array> {
  // @req: F-012
  // @req: F-013
  throw new Error("NotImplemented: exportVideo");
}
