import { describe, it, expect } from "vitest";
import { exportVideo } from "@core/video/exporter";

function mk(w: number, h: number, r: number, g: number, b: number) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4 + 0] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { data, width: w, height: h } as any;
}

describe("video metamorphic - layout permutation invariance", () => {
  it("output size and magic prefix unaffected by viewport order", async () => {
    // @req: M03-layout-permutation
    const frames = [mk(3, 3, 255, 0, 0), mk(3, 3, 0, 255, 0), mk(3, 3, 0, 0, 255)];
    const a = await exportVideo(frames, { target: "layout", fps: 30 });
    const b = await exportVideo([...frames].reverse(), { target: "layout", fps: 30 });
    // Our placeholder exporter is designed so size depends only on meta (not order)
    expect(a.byteLength).toEqual(b.byteLength);
    expect(Array.from(a.slice(0, 4))).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
    expect(Array.from(b.slice(0, 4))).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
  });
});
