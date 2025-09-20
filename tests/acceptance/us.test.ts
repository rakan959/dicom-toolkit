import { describe, it, expect } from "vitest";
import { buildManifestFromFiles } from "@core/seriesStore";

function makeDicomFile(name: string): File {
  // Using .dcm suffix bypasses deep magic check (allowed by implementation)
  return new File([new Uint8Array([0])], name, { type: "application/dicom" });
}

describe("Ultrasound support", () => {
  it("builds a manifest with US modality and correct frameCount for multi-frame", async () => {
    // @req: F-008
    const f = makeDicomFile("study-S1_series-SE1_inst-I1_frames-10_mod-US.dcm");
    const manifest = await buildManifestFromFiles([f]);
    expect(manifest).toHaveLength(1);
    expect(manifest[0].series).toHaveLength(1);
    const se = manifest[0].series[0];
    expect(se.modality).toBe("US");
    expect(se.sopInstances).toHaveLength(1);
    expect(se.sopInstances[0].frameCount).toBe(10);
  });

  it("is order-invariant and stable when mixing single and multi-frame in the same series", async () => {
    // @req: F-008
    const f1 = makeDicomFile("study-S2_series-SE2_inst-I1_frames-5_mod-US.dcm");
    const f2 = makeDicomFile("study-S2_series-SE2_inst-I0_frames-1_mod-US.dcm");
    const m1 = await buildManifestFromFiles([f1, f2]);
    const m2 = await buildManifestFromFiles([f2, f1]);
    expect(m1).toEqual(m2);
    const se = m1[0].series[0];
    // Instances should be sorted deterministically by instance id (lexicographically)
    expect(se.sopInstances.map((i) => i.sopInstanceUID)).toEqual(["I0", "I1"]);
    expect(se.sopInstances.map((i) => i.frameCount)).toEqual([1, 5]);
  });
});
