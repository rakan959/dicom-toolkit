import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Anonymizer } from "@core/anonymizer";

describe("Redaction metamorphic properties", () => {
  it("rectangle order does not change outcome", () => {
    // @req: F-007
    const a = new Anonymizer("advanced");
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 16 }),
        fc.integer({ min: 1, max: 16 }),
        fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 1, maxLength: 256 }),
        fc.array(
          fc.record({
            x: fc.integer({ min: 0, max: 15 }),
            y: fc.integer({ min: 0, max: 15 }),
            w: fc.integer({ min: 1, max: 16 }),
            h: fc.integer({ min: 1, max: 16 }),
          }),
          { minLength: 0, maxLength: 5 },
        ),
        (w, h, pixels, rects) => {
          const data = new Uint8Array(w * h);
          for (let i = 0; i < data.length; i++) data[i] = pixels[i % pixels.length]!;
          const out1 = a.redactPixels(data, w, h, rects);
          const shuffled = [...rects].sort(() => Math.random() - 0.5);
          const out2 = a.redactPixels(data, w, h, shuffled);
          expect(Array.from(out1)).toEqual(Array.from(out2));
        },
      ),
    );
  });

  it("superset of rects yields >= zeros", () => {
    // @req: S-003
    const a = new Anonymizer("advanced");
    const w = 8,
      h = 8;
    const data = new Uint8Array(w * h).map((_, i) => (i % 251) + 1); // avoid zeros in source
    const base = a.redactPixels(data, w, h, [{ x: 1, y: 1, w: 2, h: 2 }]);
    const sup = a.redactPixels(data, w, h, [
      { x: 1, y: 1, w: 2, h: 2 },
      { x: 0, y: 0, w: 1, h: 1 },
    ]);
    const zeros = (arr: Uint8Array) => arr.reduce((n, v) => n + (v === 0 ? 1 : 0), 0);
    expect(zeros(sup)).toBeGreaterThanOrEqual(zeros(base));
  });
});
