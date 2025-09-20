import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { buildManifestFromFiles } from "@core/seriesStore";

// Helper to fabricate a DICOM-ish File with encoded IDs in filename
function mkFile(A: { study: string; series: string; inst: string }): File {
  return new File([new Uint8Array([0])], `study-${A.study}_series-${A.series}_inst-${A.inst}.dcm`);
}

describe("Manifest grouping invariants", () => {
  it("permutation of input files does not change grouped counts", async () => {
    // @req: F-015
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            study: fc.string({ minLength: 1, maxLength: 3 }),
            series: fc.string({ minLength: 1, maxLength: 3 }),
            inst: fc.string({ minLength: 1, maxLength: 3 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (triples) => {
          const files = triples.map(mkFile);
          const shuffled = fc.sample(fc.shuffledSubarray(files, { minLength: files.length, maxLength: files.length }), 1)[0]!;
          const m1 = await buildManifestFromFiles(files);
          const m2 = await buildManifestFromFiles(shuffled);
          // Compare as multisets of (study, series, inst)
          const flat = (m: any) => {
            const out: string[] = [];
            for (const st of m) {
              for (const se of st.series) {
                for (const i of se.sopInstances) {
                  out.push(`${st.studyInstanceUID}/${se.seriesInstanceUID}/${i.sopInstanceUID}`);
                }
              }
            }
            return out;
          };
          expect(new Set(flat(m1))).toEqual(new Set(flat(m2)));
        }
      )
    );
  });
});
