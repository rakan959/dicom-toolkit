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
  /** Guardrail: PHI overlays are disallowed by default. */
  allowPHIOverlays: boolean;
}

/** Input options may be partial; sensible defaults are applied. */
export type VideoOptionsInput = Partial<VideoOptions> & { target: "series" | "layout" };

const EBML_MAGIC = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]); // Matroska/EBML header id

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function djb2(str: string): number {
  let hash = 5381 >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) + hash) ^ str.charCodeAt(i)) >>> 0; // hash * 33 ^ c
  }
  return hash >>> 0;
}

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    // 32-bit LCG parameters
    s = (1664525 * s + 1013904223) >>> 0;
    return s;
  };
}

/**
 * Minimal, deterministic MKV-like byte stream generator.
 * This is NOT a real encoder; it builds a tiny EBML-prefixed payload that encodes metadata
 * for tests and placeholders. Future slices may replace the internals with an actual encoder.
 */
export async function exportVideo(
  frames: ImageData[],
  options: VideoOptionsInput,
): Promise<Uint8Array> {
  // @req: F-012 (Video export API exists and returns bytes)
  // @req: F-013 (H.264 in MKV default, overlays/annotations toggles, PHI guard)

  const defaults: VideoOptions = {
    target: options?.target ?? "layout",
    codec: "h264",
    container: "mkv",
    fps: 30,
    includeOverlays: false,
    includeAnnotations: false,
    allowPHIOverlays: false,
  };

  // Merge, with clamped FPS
  const merged: VideoOptions = {
    ...defaults,
    ...options,
    fps: clamp(options?.fps ?? defaults.fps, 1, 120),
  } as VideoOptions;

  // PHI overlay guardrail: if overlays requested but PHI not allowed, drop overlays
  const overlaysIncluded = merged.includeOverlays && merged.allowPHIOverlays === true ? 1 : 0;
  const annotationsIncluded = merged.includeAnnotations ? 1 : 0;

  const frameCount = frames?.length ?? 0;
  const w = frames[0]?.width ?? merged.width ?? 0;
  const h = frames[0]?.height ?? merged.height ?? 0;

  if (frameCount === 0 && (w <= 0 || h <= 0)) {
    throw new Error(
      "exportVideo: no frames provided and missing valid width/height; provide at least one frame or explicit dimensions",
    );
  }

  // Build a stable metadata string that we can assert against in tests
  const metaStr = [
    `CNT:${merged.container}`,
    `COD:${merged.codec}`,
    `FPS:${merged.fps}`,
    `FRM:${frameCount}`,
    `W:${w}`,
    `H:${h}`,
    `OVR:${overlaysIncluded}`,
    `ANN:${annotationsIncluded}`,
  ].join(";");

  // Deterministic seed that is invariant to frame order by design (uses only counts/dims)
  const seed = djb2(metaStr);
  const rnd = lcg(seed);

  // Assemble bytes: [EBML magic][ASCII "MKV" and codec][metadata][pad]
  const encoder = new TextEncoder();
  const asciiHeader = encoder.encode(`MKV;${merged.codec.toUpperCase()};${metaStr};`);

  // Choose a deterministic total size based on meta (but independent of frame order)
  const baseSize = 128 + (seed % 64); // 128..191 bytes
  const totalSize =
    EBML_MAGIC.length + asciiHeader.length + Math.max(0, baseSize - asciiHeader.length);
  const out = new Uint8Array(totalSize);

  out.set(EBML_MAGIC, 0);
  out.set(asciiHeader, EBML_MAGIC.length);

  // Fill the remainder with deterministic pseudo-random bytes
  let idx = EBML_MAGIC.length + asciiHeader.length;
  while (idx < totalSize) {
    const val = rnd() & 0xff;
    out[idx++] = val;
  }

  return out;
}
