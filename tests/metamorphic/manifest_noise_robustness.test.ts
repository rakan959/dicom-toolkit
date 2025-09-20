import { describe, it, expect } from "vitest";
import { buildManifestFromFiles } from "@core/seriesStore";

describe("Manifest robustness to non-DICOM noise", () => {
  it("adding non-DICOM files does not change the manifest grouping", async () => {
    // @req: F-015
    const base = [
      new File([new Uint8Array([0])], "study-A_series-S1_inst-I1.dcm"),
      new File([new Uint8Array([0])], "study-A_series-S1_inst-I2.dcm"),
    ];
    const noisy = base.concat([
      new File([new Uint8Array([1, 2, 3])], "readme.txt"),
      new File([new Uint8Array([4, 5])], "image.png", { type: "image/png" }),
      new File([new Uint8Array([6, 7, 8, 9])], "archive.zip", { type: "application/zip" }),
    ]);
    const m1 = await buildManifestFromFiles(base);
    const m2 = await buildManifestFromFiles(noisy);
    expect(JSON.stringify(m2)).toBe(JSON.stringify(m1));
  });
});
