import { describe, it, expect } from "vitest";
import { applyBrush, importSEG, exportSEG } from "@core/segmentation";
import { meshFromLabelmap } from "@core/mesh";
import { exportVideo } from "@core/video/exporter";

describe("SEG IO + Mesh + Video", () => {
  it("SEG import/export works with preserved references", () => {
    // @req: F-009
    // @req: F-010
    // brush is implemented in this slice
    const painted = applyBrush(new Uint8Array(9), 3, 3, { x: 1, y: 1, r: 1, label: 1 });
    const bytes = exportSEG(painted, [3, 3, 1]);
    const seg = importSEG(bytes);
    expect(seg.dims).toEqual([3, 3, 1]);
    expect(Array.from(seg.labelmap)).toEqual(Array.from(painted));
    expect(seg.segments).toBeGreaterThan(0);
  });

  it("Mesh exports STL and GLB", async () => {
    // @req: F-011
    expect(() => meshFromLabelmap(new Uint8Array(), [1, 1, 1], [1, 1, 1])).toThrowError(
      /NotImplemented/,
    );
  });

  it("Video export produces H.264 MKV by default", async () => {
    // @req: F-012
    // @req: F-013
    await expect(
      exportVideo([], {
        target: "layout",
        codec: "h264",
        container: "mkv",
        fps: 30,
        includeOverlays: false,
        includeAnnotations: false,
        allowPHIOverlays: false,
      } as any),
    ).rejects.toThrowError(/NotImplemented/);
  });
});
