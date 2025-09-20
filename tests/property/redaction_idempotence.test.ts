import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Anonymizer } from "@core/anonymizer";

describe("Advanced redaction properties", () => {
  it("idempotent redaction and non-leak of originals", () => {
    // @req: F-007
    // @req: S-003
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
          const width = w;
          const height = h;
          const data = new Uint8Array(width * height);
          for (let i = 0; i < data.length; i++) data[i] = pixels[i % pixels.length]!;
          const a = new Anonymizer("advanced");
          const out1 = a.redactPixels(data, width, height, rects);
          const out2 = a.redactPixels(out1, width, height, rects);
          // Idempotent
          expect(Array.from(out2)).toEqual(Array.from(out1));
          // Originals unchanged
          expect(Array.from(data)).not.toBe(out1);
        },
      ),
    );
  });
});
