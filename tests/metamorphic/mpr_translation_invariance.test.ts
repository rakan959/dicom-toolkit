import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { worldToSlice } from "@core/mpr";

// Metamorphic relation: translating origin by delta shifts ijk by -delta/spacing (axis-aligned)
describe("MPR transforms - translation metamorphic relation", () => {
  it("Translating world and origin together leaves ijk unchanged", () => {
    // @req: F-004
    const normal = { x: 0, y: 0, z: 1 } as const;
    fc.assert(
      fc.property(
        fc.record({
          origin: fc.record({
            x: fc.integer({ min: -100, max: 100 }),
            y: fc.integer({ min: -100, max: 100 }),
            z: fc.integer({ min: -100, max: 100 }),
          }),
          spacing: fc.record({
            x: fc.float({ min: 0.5, max: 4, noNaN: true }),
            y: fc.float({ min: 0.5, max: 4, noNaN: true }),
            z: fc.float({ min: 0.5, max: 4, noNaN: true }),
          }),
          world: fc.record({
            x: fc.integer({ min: -50, max: 50 }),
            y: fc.integer({ min: -50, max: 50 }),
            z: fc.integer({ min: -50, max: 50 }),
          }),
          delta: fc.record({
            x: fc.integer({ min: -10, max: 10 }),
            y: fc.integer({ min: -10, max: 10 }),
            z: fc.integer({ min: -10, max: 10 }),
          }),
        }),
        ({ origin, spacing, world, delta }) => {
          const ijk = worldToSlice(world, origin, spacing, normal);
          const ijkShifted = worldToSlice(
            { x: world.x + delta.x, y: world.y + delta.y, z: world.z + delta.z },
            { x: origin.x + delta.x, y: origin.y + delta.y, z: origin.z + delta.z },
            spacing,
            normal,
          );
          expect(ijkShifted).toEqual(ijk);
        },
      ),
    );
  });
});
