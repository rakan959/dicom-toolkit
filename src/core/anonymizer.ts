import { SessionRandom } from "@utils/crypto";

/** Non-deterministic overwrite mapping stable within a session. */
export class Anonymizer {
  private readonly rng = new SessionRandom("A");
  constructor(private readonly mode: "simple" | "advanced") {}
  // @req: F-006
  // @req: F-007
  // @req: S-001
  // @req: S-002
  // @req: S-003

  /** Returns whether an instance should be dropped in simple mode due to burned-in PHI. */
  shouldDropForBurnedInPHI(_headers: Record<string, unknown>): boolean {
    if (this.mode !== "simple") return false;
    // DICOM (0028,0301) BurnedInAnnotation: "YES" or "NO"
    // Accept case-insensitive key and value; also handle boolean/number truthiness
    const key = Object.keys(_headers || {}).find((k) => k.toLowerCase() === "burnedinannotation");
    if (!key) return false;
    const v = (_headers as any)[key];
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "yes" || s === "true" || s === "1") return true;
      return false;
    }
    if (typeof v === "boolean") return v === true;
    if (typeof v === "number") return v !== 0;
    return false;
  }

  /** Maps PHI tag values to randomized equivalents, stable within session. */
  mapPHI(value: string): string {
    return this.rng.mapValue(value);
  }

  /**
   * Apply pixel redaction rectangles.
   * - Only applies in "advanced" mode; otherwise returns the input as-is.
   * - Rectangles are intersected with image bounds; zero/negative sizes are ignored.
   * - Returns a new Uint8Array (input is not mutated).
   * - Redaction uses a neutral value (default 0) for 8-bit frames.
   */
  redactPixels(
    _pixelData: Uint8Array,
    _width: number,
    _height: number,
    _rects: { x: number; y: number; w: number; h: number }[],
    redactValue: number = 0,
  ): Uint8Array {
    if (this.mode !== "advanced") return _pixelData;
    const out = new Uint8Array(_pixelData); // do not mutate original
    const width = Math.max(0, Math.floor(_width));
    const height = Math.max(0, Math.floor(_height));
    if (width <= 0 || height <= 0 || out.length === 0) return out;
    // Clamp redact value for 8-bit data
    const rv = Math.min(255, Math.max(0, Math.floor(redactValue)));

    for (const r of _rects || []) {
      // Normalize rectangle; ignore zero/negative sizes
      const rx0 = Math.floor(r.x);
      const ry0 = Math.floor(r.y);
      const rw = Math.floor(r.w);
      const rh = Math.floor(r.h);
      if (rw <= 0 || rh <= 0) continue;
      const rx1 = rx0 + rw - 1;
      const ry1 = ry0 + rh - 1;
      const minX = Math.min(rx0, rx1);
      const maxX = Math.max(rx0, rx1);
      const minY = Math.min(ry0, ry1);
      const maxY = Math.max(ry0, ry1);
      // Intersect with image bounds [0,width-1] x [0,height-1]
      const x0 = Math.max(0, minX);
      const y0 = Math.max(0, minY);
      const x1 = Math.min(width - 1, maxX);
      const y1 = Math.min(height - 1, maxY);
      if (x0 > x1 || y0 > y1) continue; // no overlap
      for (let y = y0; y <= y1; y++) {
        const row = y * width;
        for (let x = x0; x <= x1; x++) {
          const idx = row + x;
          if (idx >= 0 && idx < out.length) out[idx] = rv; // neutral value (configurable)
        }
      }
    }
    return out;
  }

  /**
   * Apply case-insensitive header overrides; returns a new object.
   * Behavior:
   * - Keys are matched case-insensitively against existing header keys. If a match exists,
   *   the original header key casing is preserved and its value is replaced.
   * - If no case-insensitive match exists, a new key is added using the override's original casing.
   * - Multiple overrides that differ only by case will target the same resolved key; last write wins.
   * - The input `headers` object is not mutated.
   */
  applyOverrides(
    headers: Record<string, unknown>,
    overrides: Record<string, unknown> | undefined | null,
  ): Record<string, unknown> {
    const h = { ...(headers || {}) } as Record<string, unknown>;
    if (!overrides) return h;
    const lowerToKey = new Map<string, string>();
    for (const k of Object.keys(h)) lowerToKey.set(k.toLowerCase(), k);
    for (const ok of Object.keys(overrides)) {
      const lk = ok.toLowerCase();
      const targetKey = lowerToKey.get(lk) ?? ok;
      h[targetKey] = (overrides as any)[ok];
      if (!lowerToKey.has(lk)) lowerToKey.set(lk, targetKey);
    }
    return h;
  }
}
