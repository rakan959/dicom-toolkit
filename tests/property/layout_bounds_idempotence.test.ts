import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createLayout, assignSeriesToViewport, getAssignments } from "@ui/Layout";

// @req: F-003

describe("Layout - property", () => {
  it("idempotent render and bounds checking on assignment", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3 }), fc.integer({ min: 1, max: 3 }), (r, c) => {
        const root = document.createElement("div");
        const api = createLayout(root, { rows: r, cols: c });
        api.render();
        api.render();
        const count = r * c;
        expect(root.querySelectorAll('[data-test="viewport"]').length).toBe(count);
        // Out of bounds is ignored
        assignSeriesToViewport(api, count + 1, { studyInstanceUID: "X", seriesInstanceUID: "Y" });
        expect(getAssignments(api).length).toBe(count);
      })
    );
  });
});
