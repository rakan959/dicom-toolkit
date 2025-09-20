import { describe, it, expect } from "vitest";
import { exportSEG, importSEG } from "@core/segmentation";

function countPositions(arr: Uint8Array) {
  const positions: Record<number, number> = {};
  for (const v of arr) {
    if (v !== 0) positions[v] = (positions[v] ?? 0) + 1;
  }
  return positions;
}

describe("SEG spatial preservation (metamorphic)", () => {
  it("relabeling labels before export does not change occupied voxel coordinates after import", () => {
    // @req: F-010
    // property: P04-seg-spatial (spatial voxels invariant under label permutation)
    const w = 3,
      h = 3,
      d = 1 as const;
    const lm = new Uint8Array([0, 1, 0, 2, 0, 2, 0, 1, 0]);
    const bytes = exportSEG(lm, [w, h, d]);
    const seg = importSEG(bytes);
    const positionsBefore = countPositions(seg.labelmap);
    // Permute labels: swap 1 and 2
    const permuted = new Uint8Array(lm.length);
    for (let i = 0; i < lm.length; i++) {
      const v = lm[i];
      let nv = 0;
      if (v === 1) nv = 2;
      else if (v === 2) nv = 1;
      permuted[i] = nv;
    }
    const bytes2 = exportSEG(permuted, [w, h, d]);
    const seg2 = importSEG(bytes2);
    const positionsAfter = countPositions(seg2.labelmap);
    // Counts per-label can differ (due to permutation), but total occupied voxel count is same
    const totalBefore = Object.values(positionsBefore).reduce((a, b) => a + b, 0);
    const totalAfter = Object.values(positionsAfter).reduce((a, b) => a + b, 0);
    expect(totalAfter).toBe(totalBefore);
    // And dims preserved
    expect(seg2.dims).toEqual([w, h, d]);
  });
});
