import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { buildManifestFromFiles } from "@core/seriesStore";

function makeDicomFile(name: string): File {
  return new File([new Uint8Array([0])], name, { type: "application/dicom" });
}

describe("US properties", () => {
  it("frameCount is >= 1 for US instances and modality is 'US' when encoded", async () => {
    // @req: F-008
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 50 }), async (frames) => {
        const f = makeDicomFile(`study-P_series-Q_inst-R_frames-${frames}_mod-US.dcm`);
        const m = await buildManifestFromFiles([f]);
        const se = m[0].series[0];
        expect(se.modality).toBe("US");
        expect(se.sopInstances[0].frameCount).toBeGreaterThanOrEqual(1);
        expect(se.sopInstances[0].frameCount).toBe(frames);
      }),
    );
  });
});
