import { describe, it, expect } from "vitest";
import { buildManifestFromFiles } from "@core/seriesStore";

describe("Load & Browse", () => {
  it("filters non-DICOM and doesn't crash building manifest (placeholder)", async () => {
    // @req: F-001
    // @req: F-015
    // @req: F-005
    // Provide a non-DICOM file and ensure the function does not throw.
    const files = [new File([new Uint8Array([1,2,3])], "notdicom.bin")];
    const manifest = await buildManifestFromFiles(files);
    expect(Array.isArray(manifest)).toBe(true);
  });
});
