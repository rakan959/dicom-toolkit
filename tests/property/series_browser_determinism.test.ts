import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { renderSeriesBrowser } from "@ui/SeriesBrowser";

describe("Series Browser determinism", () => {
  it("idempotent rendering and deterministic order", () => {
    // @req: F-005
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.string(), fc.string()), { minLength: 1, maxLength: 8 }),
        (pairs) => {
          const studyUID = "S"; // single study for simplicity
          const manifest = [
            {
              studyInstanceUID: studyUID,
              series: pairs.map(([a, b]) => ({
                seriesInstanceUID: `${a}:${b}`,
                modality: "OT",
                sopInstances: [{ sopInstanceUID: "i", frameCount: 1 }],
              })),
            },
          ];
          const root = document.createElement("div");
          renderSeriesBrowser(root, manifest);
          const firstHtml = root.innerHTML;
          // Re-render shouldn't change DOM when manifest is same
          renderSeriesBrowser(root, manifest);
          expect(root.innerHTML).toBe(firstHtml);
        },
      ),
    );
  });
});
