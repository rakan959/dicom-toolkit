import { describe, it, expect } from "vitest";
import { worldToSlice, sliceToWorld } from "@core/mpr";

// A05-mpr (acceptance)
describe("MPR coordinate transforms (acceptance)", () => {
  it("Given origin+spacing, When converting world->slice->world, Then we get the same world back", () => {
    // @req: F-004
    const origin = { x: 10, y: -5, z: 2 };
    const spacing = { x: 2, y: 0.5, z: 4 };
    const normal = { x: 0, y: 0, z: 1 }; // axis-aligned slice normal (minimal scope)

    const world = { x: 14, y: -3, z: 10 }; // delta = (4, 2, 8) -> ijk = (2, 4, 2)
    const ijk = worldToSlice(world, origin, spacing, normal);
    expect(ijk).toEqual({ i: 2, j: 4, k: 2 });

    const back = sliceToWorld(ijk, origin, spacing, normal);
    expect(back).toEqual(world);
  });

  it("handles non-unit spacing and non-zero origin deterministically", () => {
    // @req: F-004
    const origin = { x: -3, y: 7, z: 100 };
    const spacing = { x: 0.25, y: 2, z: 5 };
    const normal = { x: 0, y: 0, z: 1 };

    const world = { x: -2.5, y: 3, z: 115 };
    const ijk = worldToSlice(world, origin, spacing, normal);
    // (0.5 / 0.25 = 2), (-4 / 2 = -2), (15 / 5 = 3)
    expect(ijk).toEqual({ i: 2, j: -2, k: 3 });
    expect(sliceToWorld(ijk, origin, spacing, normal)).toEqual(world);
  });
});
