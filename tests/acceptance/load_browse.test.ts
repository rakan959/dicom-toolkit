import { describe, it, expect, vi } from "vitest";
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

  it("builds a minimal manifest grouped by Study/Series UIDs from filenames", async () => {
    // @req: F-001
    // @req: F-015
    // Given three DICOM-like files encoded with study/series/instance in their names
    const files = [
      new File([new Uint8Array([0])], "study-A_series-S1_inst-I1.dcm"),
      new File([new Uint8Array([0])], "study-A_series-S1_inst-I2.dcm"),
      new File([new Uint8Array([0])], "study-A_series-S2_inst-J1.dcm"),
    ];
    // When building the manifest
    const manifest = await buildManifestFromFiles(files);
    // Then we have one study (A) with two series (S1,S2)
    expect(manifest.length).toBe(1);
    expect(manifest[0].studyInstanceUID).toBe("A");
  const seriesUIDs = manifest[0].series.map((s) => s.seriesInstanceUID).sort((a,b)=>a.localeCompare(b));
    expect(seriesUIDs).toEqual(["S1", "S2"]);
    const s1 = manifest[0].series.find((s) => s.seriesInstanceUID === "S1")!;
  expect(s1.sopInstances.map((i) => i.sopInstanceUID).sort((a,b)=>a.localeCompare(b))).toEqual(["I1", "I2"]);
  });

  it("does not perform network requests while building manifest (offline)", async () => {
    // @req: F-001
    const originalFetch = globalThis.fetch;
    const spy = vi.fn(() => {
      throw new Error("Network call forbidden in buildManifestFromFiles");
    });
  (globalThis as any).fetch = spy;
    try {
      const files = [new File([new Uint8Array([0])], "study-A_series-S1_inst-I1.dcm")];
      await buildManifestFromFiles(files);
      expect(spy).not.toHaveBeenCalled();
    } finally {
  (globalThis as any).fetch = originalFetch!;
    }
  });

  it("ignores files with non-matching filenames when building the manifest", async () => {
    // @req: F-015
    // Only first two are valid per our filename heuristic
    const files = [
      new File([new Uint8Array([0])], "study-A_series-S1_inst-I1.dcm"), // valid
      new File([new Uint8Array([0])], "study-A_series-S1_inst-I2.dcm"), // valid
      new File([new Uint8Array([1])], "not-a-dicom-file.txt"), // invalid (not DICOM)
      new File([new Uint8Array([2])], "randomfile.dcm"), // invalid (DICOM-ish but pattern mismatch)
      new File([new Uint8Array([3])], "study-A_series-S1.dcm"), // invalid (missing instance)
    ];

    const manifest = await buildManifestFromFiles(files);
    expect(manifest.length).toBe(1);
    const study = manifest[0];
    expect(study.studyInstanceUID).toBe("A");
    expect(study.series.length).toBe(1);
    const s1 = study.series[0];
    expect(s1.seriesInstanceUID).toBe("S1");
    const insts = s1.sopInstances.map((i) => i.sopInstanceUID).sort((a, b) => a.localeCompare(b));
    expect(insts).toEqual(["I1", "I2"]);
  });

  it("accepts UIDs containing underscores and periods in filename segments", async () => {
    // @req: F-015
    const files = [
      new File([new Uint8Array([0])], "study-1.2.840_113619_series-9.10_11.12_inst-13_14.15.dcm"),
      new File([new Uint8Array([0])], "study-1.2.840_113619_series-9.10_11.12_inst-16_17.18.dcm"),
    ];
    const manifest = await buildManifestFromFiles(files);
    expect(manifest.length).toBe(1);
    const st = manifest[0];
    expect(st.studyInstanceUID).toBe("1.2.840_113619");
    expect(st.series.length).toBe(1);
    const se = st.series[0];
    expect(se.seriesInstanceUID).toBe("9.10_11.12");
    const insts = se.sopInstances.map((i) => i.sopInstanceUID).sort((a, b) => a.localeCompare(b));
    expect(insts).toEqual(["13_14.15", "16_17.18"]);
  });
});
