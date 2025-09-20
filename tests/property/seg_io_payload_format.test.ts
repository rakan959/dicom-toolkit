import { describe, it, expect } from "vitest";
import { exportSEG } from "@core/segmentation";

describe("SEG payload format includes optional UID metadata", () => {
  it("embeds SeriesInstanceUID and FrameOfReferenceUID in JSON payload when provided", () => {
    // @req: F-010
    const data = new Uint8Array([0, 1, 2, 0]);
    const w = 2,
      h = 2,
      d = 1 as const;
    const opts = {
      SeriesInstanceUID: "1.2.840.10008.1.2.3",
      FrameOfReferenceUID: "2.25.42",
    };
    const bytes = exportSEG(data, [w, h, d], opts);
    const magic = String.fromCharCode(bytes[128], bytes[129], bytes[130], bytes[131]);
    expect(magic).toBe("DICM");
    const jsonStr = new TextDecoder().decode(bytes.slice(132));
    const obj = JSON.parse(jsonStr);
    expect(obj._format).toBe("SEG-MIN-1");
    expect(obj.dims).toEqual([w, h, d]);
    expect(obj.SeriesInstanceUID).toBe(opts.SeriesInstanceUID);
    expect(obj.FrameOfReferenceUID).toBe(opts.FrameOfReferenceUID);
  });
});
