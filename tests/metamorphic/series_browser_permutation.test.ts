import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { renderSeriesBrowser } from "@ui/SeriesBrowser";

describe("Series Browser permutation invariance", () => {
  it("renders same DOM regardless of input order of studies/series", () => {
    // @req: F-005
    // @req: F-014
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            study: fc.string(),
            series: fc.array(fc.string(), { minLength: 1, maxLength: 4 }),
          }),
          { minLength: 1, maxLength: 3 },
        ),
        (studies) => {
          // Build manifest then shuffle orders
          const manifest = studies.map((s) => ({
            studyInstanceUID: s.study,
            series: s.series.map((se) => ({
              seriesInstanceUID: se,
              modality: "OT",
              sopInstances: [{ sopInstanceUID: "i", frameCount: 1 }],
            })),
          }));

          // Render with given order
          const root1 = document.createElement("div");
          renderSeriesBrowser(root1, manifest);
          const html1 = root1.innerHTML;

          // Render with permuted order
          const root2 = document.createElement("div");
          const shuffled = [...manifest]
            .sort(() => Math.random() - 0.5)
            .map((st) => ({
              ...st,
              series: [...st.series].sort(() => Math.random() - 0.5),
            }));
          renderSeriesBrowser(root2, shuffled);
          const html2 = root2.innerHTML;

          expect(html1).toBe(html2);
        },
      ),
    );
  });
});
