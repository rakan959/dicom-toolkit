import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { exportSEG, importSEG } from "@core/segmentation";

function genDims() {
  return fc.tuple(
    fc.integer({ min: 1, max: 6 }),
    fc.integer({ min: 1, max: 6 }),
    fc.integer({ min: 1, max: 3 }),
  );
}

describe("SEG IO roundtrip property", () => {
  it("export then import preserves dims and bytes for arbitrary small volumes", () => {
    // @req: F-010
    fc.assert(
      fc.property(
        genDims(),
        fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 6 * 6 * 3 }),
        (dims, values) => {
          const [w, h, d] = dims;
          const size = w * h * d;
          const data = new Uint8Array(size);
          for (let i = 0; i < size; i++) data[i] = values[i % values.length] as number;
          const bytes = exportSEG(data, [w, h, d]);
          const seg = importSEG(bytes);
          expect(seg.dims).toEqual([w, h, d]);
          expect(Array.from(seg.labelmap)).toEqual(Array.from(data));
          expect(seg.segments).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });
});
