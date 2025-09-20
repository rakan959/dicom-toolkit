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

export function importSEG(_segBytes: Uint8Array): { segments: number } {
  // @req: F-010
  throw new Error("NotImplemented: importSEG");
}

export function exportSEG(_labelmap: Uint8Array, _dims: [number, number, number]): Uint8Array {
  // @req: F-010
  throw new Error("NotImplemented: exportSEG");
}
