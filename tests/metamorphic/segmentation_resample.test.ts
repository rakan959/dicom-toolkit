import { describe, it, expect } from "vitest";
import { applyBrush, resampleNearest } from "@core/segmentation";

function zeros(w: number, h: number) {
  return new Uint8Array(w * h);
}

describe("Segmentation metamorphic - resample invariance", () => {
  it("nearest-neighbor resample preserves label counts", () => {
    // @req: F-009
    // property: M02-resample (label count invariant under 2x upscale via NN)
    const w = 8,
      h = 8;
    const lm0 = zeros(w, h);
    const lm1 = applyBrush(lm0, w, h, { x: 4, y: 4, r: 2, label: 1 });
    const before = Array.from(lm1).filter((v) => v === 1).length;
    const up = resampleNearest(lm1, w, h, 2, 2);
    const after = Array.from(up.data).filter((v) => v === 1).length;
    // Under nearest neighbor, each pixel scales to 4 pixels; count should scale by sx*sy
    expect(after).toBe(before * 4);
    expect(up.w).toBe(w * 2);
    expect(up.h).toBe(h * 2);
  });
});
