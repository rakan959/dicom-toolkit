/** Minimal segmentation core primitives. */
export type Tool = "brush" | "threshold" | "region" | "lasso";

/**
 * Paint a filled circle onto a labelmap (immutable: returns new array).
 */
export function applyBrush(
  labelmap: Uint8Array,
  w: number,
  h: number,
  stroke: { x: number; y: number; r: number; label?: number },
): Uint8Array {
  // @req: F-009
  const out = new Uint8Array(labelmap); // copy
  const cx = stroke.x;
  const cy = stroke.y;
  const r = Math.max(0, stroke.r | 0);
  const label = stroke.label ?? 1;
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(w - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(h - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        out[y * w + x] = label;
      }
    }
  }
  return out;
}

/**
 * Binary threshold: returns a new mask with pixels labeled when intensities are within [min,max].
 */
export function applyThreshold(
  intensities: Uint8Array,
  w: number,
  h: number,
  range: { min: number; max: number },
  label = 1,
): Uint8Array {
  // @req: F-009
  if (intensities.length !== w * h) throw new Error("applyThreshold: size mismatch");
  const out = new Uint8Array(w * h);
  const { min, max } = range;
  for (let i = 0; i < intensities.length; i++) {
    const v = intensities[i];
    if (v >= min && v <= max) out[i] = label;
  }
  return out;
}

/**
 * Region growing with 4-connected neighborhood using a value tolerance from the seed value.
 */
export function regionGrow(
  intensities: Uint8Array,
  w: number,
  h: number,
  seed: { x: number; y: number },
  tolerance: number,
  label = 1,
): Uint8Array {
  // @req: F-009
  const out = new Uint8Array(w * h);
  const sx = Math.min(Math.max(0, seed.x | 0), w - 1);
  const sy = Math.min(Math.max(0, seed.y | 0), h - 1);
  const sIdx = sy * w + sx;
  const sVal = intensities[sIdx];
  const q: number[] = [sIdx];
  out[sIdx] = label;
  const inTol = (v: number) => Math.abs(v - sVal) <= tolerance;
  while (q.length) {
    const i = q.pop()!;
    const x = i % w;
    const y = (i / w) | 0;
    const tryPush = (nx: number, ny: number) => {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
      const ni = ny * w + nx;
      if (out[ni] === label) return;
      if (inTol(intensities[ni])) {
        out[ni] = label;
        q.push(ni);
      }
    };
    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }
  return out;
}

/**
 * Point-in-polygon test using ray casting. Accepts vertices in image space.
 */
function pointInPolygon(x: number, y: number, poly: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      yi = poly[i].y;
    const xj = poly[j].x,
      yj = poly[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Fill a polygon (lasso) into a new labelmap. */
export function applyLasso(
  labelmap: Uint8Array,
  w: number,
  h: number,
  polygon: Array<{ x: number; y: number }>,
  label = 1,
): Uint8Array {
  // @req: F-009
  const out = new Uint8Array(labelmap);
  if (polygon.length < 3) return out;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // test at pixel center
      if (pointInPolygon(x + 0.5, y + 0.5, polygon)) {
        out[y * w + x] = label;
      }
    }
  }
  return out;
}

/** Nearest-neighbor resample for labelmaps. */
export function resampleNearest(
  data: Uint8Array,
  w: number,
  h: number,
  sx: number,
  sy: number,
): { data: Uint8Array; w: number; h: number } {
  // @req: F-009 (supporting utility for M02-resample property)
  const newW = Math.max(1, Math.floor(w * sx));
  const newH = Math.max(1, Math.floor(h * sy));
  const out = new Uint8Array(newW * newH);
  for (let y = 0; y < newH; y++) {
    const srcY = Math.min(h - 1, Math.floor(y / sy));
    for (let x = 0; x < newW; x++) {
      const srcX = Math.min(w - 1, Math.floor(x / sx));
      out[y * newW + x] = data[srcY * w + srcX];
    }
  }
  return { data: out, w: newW, h: newH };
}

export function importSEG(segBytes: Uint8Array): {
  segments: number;
  dims: [number, number, number];
  labelmap: Uint8Array;
} {
  // @req: F-010
  // Minimal, self-describing container decode.
  // Supports two formats:
  // 1) Legacy JSON placeholder (no preamble)
  // 2) Part 10 container with 128-byte preamble + 'DICM' + JSON payload
  if (segBytes.length === 0) throw new Error("NotImplemented: importSEG");
  const hasPreamble =
    segBytes.length > 132 &&
    segBytes[128] === 0x44 && // 'D'
    segBytes[129] === 0x49 && // 'I'
    segBytes[130] === 0x43 && // 'C'
    segBytes[131] === 0x4d; // 'M'
  const start = hasPreamble ? 132 : 0;
  const json = new TextDecoder().decode(segBytes.slice(start));
  const obj: any = JSON.parse(json);
  if (!obj || obj._format !== "SEG-MIN-1") throw new Error("importSEG: unknown format");
  const dims = obj.dims as [number, number, number];
  if (!Array.isArray(dims) || dims.length !== 3) throw new Error("importSEG: invalid dims");
  const dataB64 = obj.data as string;
  if (typeof dataB64 !== "string") throw new Error("importSEG: invalid data");
  const buf = Uint8Array.from(atob(dataB64), (c) => c.charCodeAt(0));
  const expected = dims[0] * dims[1] * dims[2];
  if (buf.length !== expected) throw new Error("importSEG: size mismatch");
  const segments = obj.segments as number;
  return { segments: segments | 0, dims, labelmap: buf };
}

export function exportSEG(labelmap: Uint8Array, dims: [number, number, number]): Uint8Array {
  // @req: F-010
  // Minimal, self-describing container encode with a DICOM Part 10 preamble.
  // Note: This is a transitional container; a follow-up slice will create a full DICOM SEG dataset.
  if (labelmap.length === 0) throw new Error("NotImplemented: exportSEG");
  const [w, h, d] = dims;
  if (labelmap.length !== w * h * d) throw new Error("exportSEG: size mismatch");
  // Count unique labels excluding 0
  const seen = new Set<number>();
  for (const v of labelmap) {
    if (v !== 0) seen.add(v);
  }
  const segments = seen.size;
  const dataB64 = btoa(String.fromCharCode(...labelmap));
  const payload = { _format: "SEG-MIN-1", dims, segments, data: dataB64 };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
  // Build Part 10 preamble: 128 zero bytes + 'DICM'
  const preamble = new Uint8Array(132);
  // zeros already
  preamble[128] = 0x44; // 'D'
  preamble[129] = 0x49; // 'I'
  preamble[130] = 0x43; // 'C'
  preamble[131] = 0x4d; // 'M'
  // Concatenate
  const out = new Uint8Array(preamble.length + jsonBytes.length);
  out.set(preamble, 0);
  out.set(jsonBytes, preamble.length);
  return out;
}
