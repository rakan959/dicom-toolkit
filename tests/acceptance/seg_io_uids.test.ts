import { describe, it, expect } from "vitest";
import { exportSEG, importSEG } from "@core/segmentation";

describe("SEG IO with UIDs - acceptance (A08-seg-io)", () => {
  it("round-trips SeriesInstanceUID and FrameOfReferenceUID along with dims and labelmap", () => {
    // @req: F-010
    const w = 2,
      h = 2,
      d = 1 as const;
    const lm = new Uint8Array([0, 1, 2, 0]);
    const seriesUID = "1.2.840.113619.2.55.3.604688432.178.1699999999.1";
    const forUID = "2.25.123456789012345678901234567890123456";
    // For now export accepts optional metadata via an overload: dims extended with metadata
    // We pass them via an options object for clarity.
    const bytes = exportSEG(lm, [w, h, d], {
      SeriesInstanceUID: seriesUID,
      FrameOfReferenceUID: forUID,
    });
    // sanity: payload includes the UIDs
    const magic = String.fromCharCode(bytes[128], bytes[129], bytes[130], bytes[131]);
    expect(magic).toBe("DICM");
    const obj = JSON.parse(new TextDecoder().decode(bytes.slice(132)));
    expect(obj.SeriesInstanceUID).toBe(seriesUID);
    expect(obj.FrameOfReferenceUID).toBe(forUID);
    const seg = importSEG(bytes) as any;
    expect(seg.dims).toEqual([w, h, d]);
    expect(Array.from(seg.labelmap)).toEqual(Array.from(lm));
    expect(seg.segments).toBe(2);
    expect(seg.SeriesInstanceUID).toBe(seriesUID);
    expect(seg.FrameOfReferenceUID).toBe(forUID);
  });
});
