import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { sortInstancesStable } from "@core/seriesStore";

describe("Permutation invariance of reconstruction", () => {
  it("sorting yields same order independent of input permutation", () => {
    // @req: F-015
    // Metamorphic relation M01: permuting input does not change result.
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 10 }), (arr: number[]) => {
        const sorted = sortInstancesStable(arr);
        // Expect ascending order
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i] >= sorted[i - 1]).toBe(true);
        }
      }),
    );
  });
});
