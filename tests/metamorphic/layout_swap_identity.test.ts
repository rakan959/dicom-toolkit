import { describe, it, expect } from "vitest";
import { createLayout, assignSeriesToViewport, getAssignments, swapViewports } from "@ui/Layout";

// @req: F-003

describe("Layout - metamorphic", () => {
  it("swapping twice restores original assignments (involution)", () => {
    const root = document.createElement("div");
    const api = createLayout(root, { rows: 1, cols: 2 });
    assignSeriesToViewport(api, 0, { studyInstanceUID: "A", seriesInstanceUID: "S1" });
    assignSeriesToViewport(api, 1, { studyInstanceUID: "B", seriesInstanceUID: "S2" });

    const before = JSON.stringify(getAssignments(api));
    swapViewports(api, 0, 1);
    swapViewports(api, 0, 1);
    const after = JSON.stringify(getAssignments(api));
    expect(after).toBe(before);
  });
});
