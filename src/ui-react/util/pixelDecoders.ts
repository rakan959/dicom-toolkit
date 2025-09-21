// Lightweight, pluggable pixel decoder registry.
// Default: no decoders registered. External code can register decoders
// for common compressed transfer syntaxes (e.g., JPEG-LS/J2K) if desired.

export type DecodedPixel = {
  pixel: Uint8Array | Uint16Array;
  bitsAllocated: 8 | 16;
  samplesPerPixel: 1 | 3;
  planarConfiguration?: 0 | 1;
};

export type PixelDecoder = (
  fileBuffer: ArrayBuffer,
  // naturalized dataset for reading tags like Rows/Columns/PI if needed
  dataset: any,
) => DecodedPixel | undefined | Promise<DecodedPixel | undefined>;

const decoders: PixelDecoder[] = [];

export function registerPixelDecoder(decoder: PixelDecoder) {
  decoders.push(decoder);
}

export async function tryDecodePixelData(
  fileBuffer: ArrayBuffer,
  dataset: any,
): Promise<DecodedPixel | undefined> {
  // Ensure default decoders are set up lazily
  await ensureDefaultDecodersRegistered();
  for (const d of decoders) {
    try {
      const res = await d(fileBuffer, dataset);
      if (res && res.pixel && (res.bitsAllocated === 8 || res.bitsAllocated === 16)) {
        return res;
      }
    } catch {
      // ignore and continue
    }
  }
  return undefined;
}

// Convenience: allow clearing registered decoders in tests
export function _clearPixelDecodersForTest() {
  decoders.length = 0;
}

// --- Built-in decoders registration ---
let _builtInsRegistered = false;

export async function ensureDefaultDecodersRegistered() {
  if (_builtInsRegistered) return;
  _builtInsRegistered = true;
  // Always register RLE Lossless decoder (1.2.840.10008.1.2.5)
  registerPixelDecoder(decodeRLEIfApplicable);
  // Optionally register JPEG-LS and JPEG 2000 decoders if provided on global at runtime by host app.
  const g: any = globalThis as any;
  const charls = g.__DTK_CODEC_CHARLS__;
  if (charls && typeof charls.decode === "function") {
    registerPixelDecoder((_, ds) => decodeWithCharLSIfApplicable(charls, ds));
  }
  const openjpeg = g.__DTK_CODEC_OPENJPEG__;
  if (openjpeg && typeof openjpeg.decode === "function") {
    registerPixelDecoder((_, ds) => decodeWithOpenJPEGIfApplicable(openjpeg, ds));
  }
}

// Helpers to extract first-frame encapsulated bytestream from naturalized dataset
function toU8(v: any): Uint8Array | undefined {
  if (!v) return undefined;
  if (v instanceof Uint8Array) return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  if (
    v.buffer instanceof ArrayBuffer &&
    typeof v.byteOffset === "number" &&
    typeof v.byteLength === "number"
  )
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  return undefined;
}

function concat(frags: Uint8Array[]): Uint8Array {
  const total = frags.reduce((s, f) => s + f.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const f of frags) {
    out.set(f, off);
    off += f.length;
  }
  return out;
}

function getEncapsulatedFirstFrameStream(dataset: any): Uint8Array | undefined {
  const pd = dataset?.PixelData;
  if (!Array.isArray(pd)) return undefined;
  const fragments: Uint8Array[] = [];
  for (const part of pd) {
    const u8 = toU8(part);
    if (u8) fragments.push(u8);
  }
  if (fragments.length === 0) return undefined;
  // If we have at least two fragments, assume first is BOT (may be empty) and subsequent are frame data.
  // If NumberOfFrames is available with offsets in BOT, use them; otherwise, concatenate all after BOT as single frame.
  let payload = fragments[0];
  let rest = fragments.slice(1);
  // If there is a BOT (first item), compute first frame slice using its offsets; BOT is uint32 little-endian offsets array.
  if (rest.length > 0) {
    const bot = payload;
    // If BOT length is multiple of 4 and >= 4, try to derive first frame size; else treat as empty BOT
    if (bot.length >= 4 && bot.length % 4 === 0) {
      const view = new DataView(bot.buffer, bot.byteOffset, bot.byteLength);
      const count = bot.length / 4;
      const offs: number[] = [];
      for (let i = 0; i < count; i++) offs.push(view.getUint32(i * 4, true));
      const nonZero = offs.filter((x) => x > 0);
      const concatRest = concat(rest);
      if (nonZero.length >= 1) {
        const start = offs[0];
        const end = nonZero.length >= 2 ? offs[1] : concatRest.length;
        return concatRest.subarray(start, Math.min(end, concatRest.length));
      }
      return concatRest; // empty BOT
    } else {
      // Treat first fragment as empty BOT
      return concat(rest);
    }
  }
  // Single fragment: treat as entire frame
  return payload;
}

// RLE Lossless decode (single-frame)
function packbitsDecode(src: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < src.length; i++) {
    const n = (src[i] << 24) >> 24; // sign-extend to int8
    if (n >= 0 && n <= 127) {
      const count = n + 1;
      for (let k = 0; k < count && i + 1 + k < src.length; k++) out.push(src[i + 1 + k]);
      i += count;
    } else if (n >= -127 && n <= -1) {
      const count = 1 - n; // -n + 1
      const val = src[i + 1] ?? 0;
      for (let k = 0; k < count; k++) out.push(val);
      i += 1;
    } else if (n === -128) {
      // no-op
    }
  }
  return new Uint8Array(out);
}

function decodeRLEIfApplicable(_fileBuffer: ArrayBuffer, dataset: any): DecodedPixel | undefined {
  const ts: string = String(dataset?.TransferSyntaxUID || "");
  if (ts !== "1.2.840.10008.1.2.5") return undefined; // RLE Lossless
  const rows = Number(dataset?.Rows || 0);
  const cols = Number(dataset?.Columns || 0);
  const spp = Number(dataset?.SamplesPerPixel || 1) as 1 | 3;
  const bits = Number(dataset?.BitsAllocated || 8) as 8 | 16;
  if (!rows || !cols) return undefined;
  // Limitations: only first frame supported; multi-frame not handled here.
  if (Number(dataset?.NumberOfFrames || 1) > 1) {
    console.warn(
      "RLE decoder: multi-frame not supported in thumbnail path; using first frame only (best-effort)",
    );
  }
  const stream = getEncapsulatedFirstFrameStream(dataset);
  if (!stream || stream.length < 64) return undefined;
  // Parse 16 uint32 offsets header
  const dv = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
  const offsets: number[] = [];
  for (let i = 0; i < 16; i++) offsets.push(dv.getUint32(i * 4, true));
  const segOffsets = offsets.filter((x) => x > 0).sort((a, b) => a - b);
  if (segOffsets.length === 0) return undefined;
  // Determine segments ranges
  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < segOffsets.length; i++) {
    const start = segOffsets[i];
    const end = i + 1 < segOffsets.length ? segOffsets[i + 1] : stream.length;
    ranges.push([start, end]);
  }
  const totalPixels = rows * cols;
  if (bits === 8) {
    // Expect spp segments of length totalPixels each after decoding
    const planes: Uint8Array[] = [];
    for (const [s, e] of ranges) planes.push(packbitsDecode(stream.subarray(s, e)));
    if (spp === 1) {
      const plane = planes[0];
      if (plane.length < totalPixels) return undefined;
      return {
        pixel: plane.subarray(0, totalPixels),
        bitsAllocated: 8,
        samplesPerPixel: 1,
        planarConfiguration: 0,
      };
    }
    if (spp === 3) {
      // R, G, B planes expected as first three segments
      if (planes.length < 3) return undefined;
      const R = planes[0],
        G = planes[1],
        B = planes[2];
      // Return planar=1 packed as [RR.. GG.. BB..]
      const out = new Uint8Array(totalPixels * 3);
      out.set(R.subarray(0, totalPixels), 0);
      out.set(G.subarray(0, totalPixels), totalPixels);
      out.set(B.subarray(0, totalPixels), totalPixels * 2);
      return { pixel: out, bitsAllocated: 8, samplesPerPixel: 3, planarConfiguration: 1 };
    }
    return undefined;
  } else {
    // 16-bit: expect 2*spp segments (LSB then MSB per sample)
    const planes: Uint8Array[] = [];
    for (const [s, e] of ranges) planes.push(packbitsDecode(stream.subarray(s, e)));
    if (planes.length < 2 * spp) return undefined;
    // Single-channel 16-bit supported
    if (spp === 1) {
      const L = planes[0],
        H = planes[1];
      const out = new Uint16Array(totalPixels);
      const lim = Math.min(totalPixels, L.length, H.length);
      for (let i = 0; i < lim; i++) out[i] = (H[i] << 8) | L[i];
      return { pixel: out, bitsAllocated: 16, samplesPerPixel: 1, planarConfiguration: 0 };
    }
    // RGB 16-bit not implemented
    console.warn("RLE decoder: 16-bit RGB not supported in this build");
    return undefined;
  }
}

// Optional JPEG-LS wrapper (if @cornerstonejs/codec-charls present)
function decodeWithCharLSIfApplicable(mod: any, dataset: any): DecodedPixel | undefined {
  const ts: string = String(dataset?.TransferSyntaxUID || "");
  if (ts !== "1.2.840.10008.1.2.4.80" && ts !== "1.2.840.10008.1.2.4.81") return undefined; // JPEGLS Lossless/Lossy
  const rows = Number(dataset?.Rows || 0);
  const cols = Number(dataset?.Columns || 0);
  const spp = Number(dataset?.SamplesPerPixel || 1);
  const bitsStored = Number(dataset?.BitsStored || dataset?.BitsAllocated || 8);
  if (!rows || !cols) return undefined;
  const bytestream = getEncapsulatedFirstFrameStream(dataset);
  if (!bytestream) return undefined;
  const result = mod.decode(bytestream, { bytesPerPixel: bitsStored <= 8 ? 1 : 2, signed: false });
  // result: { width, height, components, data (Uint8Array|Uint16Array) }
  const pixel = result.data as Uint8Array | Uint16Array;
  const bitsAllocated = (pixel.BYTES_PER_ELEMENT === 1 ? 8 : 16) as 8 | 16;
  const planarConfiguration = 0 as 0; // charls returns interleaved RGB for components>1
  return {
    pixel,
    bitsAllocated,
    samplesPerPixel: (result.components as 1 | 3) ?? (spp as 1 | 3),
    planarConfiguration,
  };
}

// Optional JPEG 2000 wrapper (if @cornerstonejs/codec-openjpeg present)
function decodeWithOpenJPEGIfApplicable(mod: any, dataset: any): DecodedPixel | undefined {
  const ts: string = String(dataset?.TransferSyntaxUID || "");
  // JPEG2000 Lossless (1.2.840.10008.1.2.4.90) or Lossy (91)
  if (ts !== "1.2.840.10008.1.2.4.90" && ts !== "1.2.840.10008.1.2.4.91") return undefined;
  const rows = Number(dataset?.Rows || 0);
  const cols = Number(dataset?.Columns || 0);
  if (!rows || !cols) return undefined;
  const bytestream = getEncapsulatedFirstFrameStream(dataset);
  if (!bytestream) return undefined;
  const result = mod.decode(bytestream);
  const pixel = result.data as Uint8Array | Uint16Array;
  const bitsAllocated = (pixel.BYTES_PER_ELEMENT === 1 ? 8 : 16) as 8 | 16;
  const samplesPerPixel = (result.components as 1 | 3) ?? 1;
  const planarConfiguration = 0 as 0; // assume interleaved output
  return { pixel, bitsAllocated, samplesPerPixel, planarConfiguration };
}
