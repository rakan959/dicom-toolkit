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

  /** Apply pixel redaction rectangles. */
  redactPixels(
    _pixelData: Uint8Array,
    _width: number,
    _height: number,
    _rects: { x: number; y: number; w: number; h: number }[],
  ): Uint8Array {
    if (this.mode !== "advanced") return _pixelData;
    throw new Error("NotImplemented: redactPixels");
  }
}
