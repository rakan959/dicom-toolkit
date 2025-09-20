import { describe, it, expect } from "vitest";
import { meshFromLabelmap } from "@core/mesh";

describe("M-mesh spacing scaling", () => {
  it("increasing spacing scales GLB buffer size non-decreasing for same bbox (@req: F-011)", () => {
    const dims: [number, number, number] = [4, 4, 4];
    const lm = new Uint8Array(dims[0] * dims[1] * dims[2]);
    // Mark a 2x2x2 cube from (1,1,1) to (2,2,2)
    const idx = (x: number, y: number, z: number) => x + dims[0] * (y + dims[1] * z);
    for (let z = 1; z <= 2; z++)
      for (let y = 1; y <= 2; y++) for (let x = 1; x <= 2; x++) lm[idx(x, y, z)] = 1;

    const a = meshFromLabelmap(lm, dims, [1, 1, 1]).glb.byteLength;
    const b = meshFromLabelmap(lm, dims, [2, 2, 2]).glb.byteLength;
    expect(b).toBeGreaterThanOrEqual(a);
  });
});
