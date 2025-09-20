import { describe, it, expect } from "vitest";
import { exportSEG, importSEG } from "@core/segmentation";

function makeLabelmap(w: number, h: number, data: number[]): Uint8Array {
  const arr = new Uint8Array(w * h);
  for (let i = 0; i < arr.length; i++) arr[i] = (data[i] ?? 0) as number;
  return arr;
}

describe("SEG import/export - acceptance (A08-seg-io)", () => {
  it("round-trips a tiny 2x2 labelmap with two segments", () => {
    // @req: F-010
    const w = 2,
      h = 2,
      d = 1 as const;
    const lm = makeLabelmap(w, h, [0, 1, 0, 2]);
    const bytes = exportSEG(lm, [w, h, d]);
    const seg = importSEG(bytes);
    expect(seg.segments).toBe(2);
    expect(seg.dims).toEqual([w, h, d]);
    expect(Array.from(seg.labelmap)).toEqual(Array.from(lm));
  });
});
