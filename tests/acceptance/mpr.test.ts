import { describe, it, expect } from "vitest";
import { worldToSlice, sliceToWorld } from "@core/mpr";

describe("MPR", () => {
  it("round-trips world <-> slice coordinates", () => {
    // @req: F-004
    const origin = { x: 0, y: 0, z: 0 };
    const spacing = { x: 1, y: 1, z: 1 };
    const normal = { x: 0, y: 0, z: 1 };
    expect(() => worldToSlice({ x: 1, y: 2, z: 3 }, origin, spacing, normal)).toThrowError(/NotImplemented/);
    expect(() => sliceToWorld({ i: 1, j: 2, k: 3 }, origin, spacing, normal)).toThrowError(/NotImplemented/);
  });
});
