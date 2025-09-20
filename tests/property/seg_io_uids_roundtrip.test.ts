import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { exportSEG, importSEG } from "@core/segmentation";

const arbUID = () =>
  fc
    .tuple(
      fc.array(fc.integer({ min: 0, max: 999999 }), { minLength: 2, maxLength: 12 }),
      fc.integer({ min: 0, max: 999999999 }),
    )
    .map(([parts, last]) => parts.join(".") + "." + String(last))
    .filter((s) => s.length >= 3 && s.length <= 64);

describe("SEG IO UID roundtrip property", () => {
  it("preserves UIDs when provided; remains valid without UIDs (back-compat)", () => {
    // @req: F-010
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 1, max: 3 }),
        fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 6 * 6 * 3 }),
        arbUID(),
        arbUID(),
        (w, h, d, values, seriesUID, forUID) => {
          const size = w * h * d;
          const data = new Uint8Array(size);
          for (let i = 0; i < size; i++) data[i] = values[i % values.length] as number;
          // With UIDs
          const bytes = exportSEG(data, [w, h, d], {
            SeriesInstanceUID: seriesUID,
            FrameOfReferenceUID: forUID,
          });
          const seg = importSEG(bytes) as any;
          expect(seg.dims).toEqual([w, h, d]);
          expect(Array.from(seg.labelmap)).toEqual(Array.from(data));
          expect(seg.SeriesInstanceUID).toBe(seriesUID);
          expect(seg.FrameOfReferenceUID).toBe(forUID);
          // Without UIDs remains acceptable (legacy format)
          const bytesLegacy = exportSEG(data, [w, h, d]);
          const segLegacy = importSEG(bytesLegacy) as any;
          expect(segLegacy.dims).toEqual([w, h, d]);
          expect(Array.from(segLegacy.labelmap)).toEqual(Array.from(data));
          expect(segLegacy.SeriesInstanceUID ?? null).toBeNull();
          expect(segLegacy.FrameOfReferenceUID ?? null).toBeNull();
        },
      ),
      { numRuns: 10, endOnFailure: true, interruptAfterTimeLimit: 2000 },
    );
  });
});
