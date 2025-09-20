import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { SessionRandom } from "@utils/crypto";

describe("Session RNG mapping stability", () => {
  it("maps identical inputs to identical outputs within a session; different inputs to different outputs", () => {
    // @req: S-001
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 }),
        (strings: string[]) => {
          const rng = new SessionRandom("T");
          const mapped = strings.map((s: string) => rng.mapValue(s));
          const setSize = new Set(mapped).size;
          expect(setSize).toBe(strings.length);
          // Stability
          for (const s of strings) {
            expect(rng.mapValue(s)).toBe(rng.mapValue(s));
          }
        },
      ),
    );
  });
});
