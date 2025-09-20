import { describe, it, expect } from "vitest";
import { applyBrush, applyThreshold } from "@core/segmentation";

function zeros(w: number, h: number) {
  return new Uint8Array(w * h);
}

describe("Segmentation properties", () => {
  it("brush is idempotent for same stroke", () => {
    // @req: F-009
    const w = 32,
      h = 32;
    const lm = zeros(w, h);
    const s = { x: 10, y: 10, r: 4, label: 1 } as const;
    const once = applyBrush(lm, w, h, s);
    const twice = applyBrush(once, w, h, s);
    expect(Array.from(twice)).toEqual(Array.from(once));
  });

  it("thresholding twice with same range is idempotent on same input", () => {
    // @req: F-009
    const w = 8,
      h = 1;
    const intens = new Uint8Array([0, 5, 10, 15, 20, 25, 30, 35]);
    const t = { min: 10, max: 25 } as const;
    const once = applyThreshold(intens, w, h, t, 1);
    const twice = applyThreshold(intens, w, h, t, 1);
    expect(Array.from(twice)).toEqual(Array.from(once));
  });
});
