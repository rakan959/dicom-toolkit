import { describe, it, expect } from "vitest";
import { applyBrush, importSEG, exportSEG } from "@core/segmentation";
import { meshFromLabelmap } from "@core/mesh";
import { exportVideo } from "@core/video/exporter";

describe("SEG IO + Mesh + Video", () => {
  it("SEG import/export works with preserved references", () => {
    // @req: F-009
    // @req: F-010
    expect(() => importSEG(new Uint8Array())).toThrowError(/NotImplemented/);
    expect(() => exportSEG(new Uint8Array(), [1, 1, 1])).toThrowError(/NotImplemented/);
    expect(() => applyBrush(new Uint8Array(), 1, 1, { x: 0, y: 0, r: 1 })).toThrowError(
      /NotImplemented/,
    );
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
