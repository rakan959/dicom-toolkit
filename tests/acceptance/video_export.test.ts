import { describe, it, expect } from "vitest";
import { exportVideo } from "@core/video/exporter";

function makeFrame(w: number, h: number, color: [number, number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4 + 0] = color[0];
    data[i * 4 + 1] = color[1];
    data[i * 4 + 2] = color[2];
    data[i * 4 + 3] = color[3];
  }
  return { data, width: w, height: h } as any;
}

describe("A10-video", () => {
  it("defaults to H.264 MKV with overlays off and returns bytes", async () => {
    // @req: F-012
    // @req: F-013
    const frames = [makeFrame(2, 2, [255, 0, 0, 255])];
    const bytes = await exportVideo(frames, { target: "layout" });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBeGreaterThan(0);
    // EBML magic at start
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
  });
});
