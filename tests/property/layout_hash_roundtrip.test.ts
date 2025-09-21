import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { encodeLayoutState, decodeLayoutState } from "../../src/ui/hashState";

describe("Layout hash round-trip", () => {
  it("encodes and decodes layout state losslessly for valid inputs", () => {
    // @req: F-109
    const seriesRefArb = fc.record({
      studyInstanceUID: fc.string({ minLength: 1, maxLength: 8 }),
      seriesInstanceUID: fc.string({ minLength: 1, maxLength: 8 }),
    });
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        fc.array(fc.option(seriesRefArb), { minLength: 1, maxLength: 9 }),
        (r, c, a) => {
          const state = { r, c, a };
          const hash = encodeLayoutState(state);
          const parsed = decodeLayoutState(hash);
          expect(parsed).not.toBeNull();
          expect(parsed!.r).toBe(r);
          expect(parsed!.c).toBe(c);
          // Align length to min(r*c, a.length)
          const max = Math.min(r * c, a.length);
          for (let i = 0; i < max; i++) {
            const ex = a[i];
            const got = parsed!.a[i];
            if (ex == null) expect(got).toBeNull();
            else {
              expect(got).not.toBeNull();
              expect(got!.studyInstanceUID).toBe(ex!.studyInstanceUID);
              expect(got!.seriesInstanceUID).toBe(ex!.seriesInstanceUID);
            }
          }
        },
      ),
    );
  });
});
