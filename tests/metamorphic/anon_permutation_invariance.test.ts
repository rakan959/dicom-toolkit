import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Anonymizer } from "@core/anonymizer";

describe("Anonymizer mapping metamorphic properties", () => {
  it("mapping is permutation-invariant within a session", () => {
    // @req: S-001
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 }),
        (values: string[]) => {
          const a = new Anonymizer("simple");
          const map1 = new Map(values.map((v) => [v, a.mapPHI(v)] as const));
          // Shuffle and remap
          const shuffled = [...values].sort(() => Math.random() - 0.5);
          const map2 = new Map(shuffled.map((v) => [v, a.mapPHI(v)] as const));
          // All mappings equal
          for (const v of values) {
            expect(map1.get(v)).toBe(map2.get(v));
          }
        },
      ),
    );
  });
});
