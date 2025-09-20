import { describe, it, expect } from "vitest";
import { applyBrush, applyThreshold, regionGrow, applyLasso } from "@core/segmentation";

function zeros(w: number, h: number) {
  return new Uint8Array(w * h);
}

function count(arr: Uint8Array, v = 1) {
  return Array.from(arr).filter((x) => x === v).length;
}

describe("Segmentation tools - acceptance (A07-seg)", () => {
  it("brush paints a filled circle and clamps to bounds", () => {
    // @req: F-009
    const w = 10,
      h = 10;
    const lm = zeros(w, h);
    const out = applyBrush(lm, w, h, { x: 5, y: 5, r: 2, label: 1 });
    // Area close to pi*r^2 = ~12.56; discrete grid yields 12 or 13
    const c = count(out, 1);
    expect(c === 12 || c === 13).toBe(true);

    // clamp: circle partly outside image shouldn't throw, stays inside
    const out2 = applyBrush(out, w, h, { x: -1, y: -1, r: 3, label: 2 });
    expect(count(out2, 2)).toBeGreaterThan(0);
  });

  it("threshold marks pixels within [min,max] range", () => {
    // @req: F-009
    const w = 5,
      h = 1;
    const intens = new Uint8Array([0, 10, 20, 30, 40]);
    const out = applyThreshold(intens, w, h, { min: 10, max: 25 }, 1);
    expect(Array.from(out)).toEqual([0, 1, 1, 0, 0]);
  });

  it("region-grow fills connectivity around seed within tolerance", () => {
    // @req: F-009
    const w = 5,
      h = 1;
    // intensities create two groups near 10 and near 30
    const intens = new Uint8Array([8, 9, 10, 28, 32]);
    const out = regionGrow(intens, w, h, { x: 2, y: 0 }, 2, 1); // seed at value 10, tol=2 -> [8..12]
    expect(Array.from(out)).toEqual([1, 1, 1, 0, 0]);
  });

  it("lasso fills simple convex polygon", () => {
    // @req: F-009
    const w = 6,
      h = 6;
    const lm = zeros(w, h);
    const square = [
      { x: 2, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 4 },
      { x: 2, y: 4 },
    ];
    const out = applyLasso(lm, w, h, square, 1);
    // Center-based fill should include at least the interior pixels
    expect(count(out, 1)).toBeGreaterThanOrEqual(4);
  });
});
