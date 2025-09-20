import { describe, it, expect } from "vitest";
import { buildManifestFromFiles } from "@core/seriesStore";

function makeDicomFile(name: string): File {
  return new File([new Uint8Array([0])], name, { type: "application/dicom" });
}

describe("US metamorphic", () => {
  it("total frames across instances in a series remains the same under splitting a multi-frame into parts", async () => {
    // @req: F-008
    const total = 12;
    const a = makeDicomFile(`study-S_series-SE_inst-I_frames-${total}_mod-US.dcm`);
    const m1 = await buildManifestFromFiles([a]);
    const sum1 = m1[0].series[0].sopInstances.reduce((acc, x) => acc + x.frameCount, 0);
    expect(sum1).toBe(total);

    // Split into two instances that together still sum to total frames
    const b = makeDicomFile(`study-S_series-SE_inst-I0_frames-7_mod-US.dcm`);
    const c = makeDicomFile(`study-S_series-SE_inst-I1_frames-5_mod-US.dcm`);
    const m2 = await buildManifestFromFiles([b, c]);
    const sum2 = m2[0].series[0].sopInstances.reduce((acc, x) => acc + x.frameCount, 0);
    expect(sum2).toBe(total);
  });
});
