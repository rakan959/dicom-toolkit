import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { exportVideo } from "@core/video/exporter";

function frameFromSeed(seed: number, w = 3, h = 2) {
  const len = w * h * 4;
  const data = new Uint8ClampedArray(len);
  let s = seed >>> 0;
  for (let i = 0; i < len; i++) {
    s = (1664525 * s + 1013904223) >>> 0;
    data[i] = s & 0xff;
  }
  return { data, width: w, height: h } as any;
}

describe("video props", () => {
  it("deterministic for identical inputs", async () => {
    // Same frames and options -> same bytes
    await fc.assert(
      fc.asyncProperty(fc.integer(), async (seed) => {
        const frames = [frameFromSeed(seed, 4, 3), frameFromSeed(seed + 1, 4, 3)];
        const a = await exportVideo(frames, { target: "layout", fps: 24 });
        const b = await exportVideo(frames, { target: "layout", fps: 24 });
        expect(Array.from(a)).toEqual(Array.from(b));
      }),
    );
  });

  it("fps is clamped to [1,120]", async () => {
    const frames = [frameFromSeed(1)];
    const lo = await exportVideo(frames, { target: "series", fps: 0 as any });
    const hi = await exportVideo(frames, { target: "series", fps: 999 as any });
    expect(lo.byteLength).toBeGreaterThan(0);
    expect(hi.byteLength).toBeGreaterThan(0);

    const dec = new TextDecoder();
    const headerLo = dec.decode(lo.slice(4, 4 + 160));
    const headerHi = dec.decode(hi.slice(4, 4 + 160));
    const fpsLo = headerLo.match(/FPS:(\d+)/)?.[1];
    const fpsHi = headerHi.match(/FPS:(\d+)/)?.[1];
    expect(Number(fpsLo)).toBe(1);
    expect(Number(fpsHi)).toBe(120);
  });
});
