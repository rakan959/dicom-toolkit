import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { worldToSlice, sliceToWorld } from "@core/mpr";

// Property: round-trip world -> slice -> world is identity for axis-aligned normal
describe("MPR transforms - round-trip property", () => {
  it("worldToSlice(sliceToWorld(ijk)) === ijk and vice versa (within integer grid)", () => {
    // @req: F-004
    // @req: P03-mpr-roundtrip
    fc.assert(
      fc.property(
        fc.record({
          origin: fc.record({
            x: fc.integer({ min: -50, max: 50 }),
            y: fc.integer({ min: -50, max: 50 }),
            z: fc.integer({ min: -50, max: 50 }),
          }),
          spacing: fc.record({
            x: fc.float({ min: 0.25, max: 5, noNaN: true }),
            y: fc.float({ min: 0.25, max: 5, noNaN: true }),
            z: fc.float({ min: 0.25, max: 5, noNaN: true }),
          }),
          ijk: fc.record({
            i: fc.integer({ min: -20, max: 20 }),
            j: fc.integer({ min: -20, max: 20 }),
            k: fc.integer({ min: -20, max: 20 }),
          }),
        }),
        ({ origin, spacing, ijk }) => {
          const normal = { x: 0, y: 0, z: 1 } as const;
          const world = sliceToWorld(ijk, origin, spacing, normal);
          const ijk2 = worldToSlice(world, origin, spacing, normal);
          expect(ijk2).toEqual(ijk);
        },
      ),
      { verbose: false },
    );
  });
});
