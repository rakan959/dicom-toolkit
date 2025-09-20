import { describe, it, expect } from "vitest";
import { exportSEG, importSEG } from "@core/segmentation";

describe("SEG IO UID metamorphic invariance", () => {
  it("changing UIDs before export does not change voxel bytes or dims after import", () => {
    // @req: F-010
    const w = 3,
      h = 2,
      d = 1 as const;
    const data = new Uint8Array([0, 1, 2, 0, 2, 1]);
    const bytesA = exportSEG(data, [w, h, d], {
      SeriesInstanceUID: "1.2.840.10008.5.1.4.1.1.66.4.1",
      FrameOfReferenceUID: "2.25.999999999999999999999999999999999999",
    });
    const bytesB = exportSEG(data, [w, h, d], {
      SeriesInstanceUID: "1.2.3.4.5.6.7.8.9",
      FrameOfReferenceUID: "2.25.1",
    });
    const segA = importSEG(bytesA);
    const segB = importSEG(bytesB);
    expect(segA.dims).toEqual([w, h, d]);
    expect(segB.dims).toEqual([w, h, d]);
    expect(Array.from(segA.labelmap)).toEqual(Array.from(data));
    expect(Array.from(segB.labelmap)).toEqual(Array.from(data));
    expect(segA.segments).toEqual(segB.segments);
  });
});
