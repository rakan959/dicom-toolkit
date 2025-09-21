import { describe, it, expect } from "vitest";
// @req: F-103
// M11-grid-permutation-invariance
import { swapAssignmentsTwice } from "@src/ui-react/LayoutGrid/model";

describe("LayoutGrid permutation invariance", () => {
  it("swapping (i, j) twice yields original state", () => {
    const init = ["A", "B", "C"];
    const after = swapAssignmentsTwice(init, 0, 2);
    expect(after).toEqual(init);
  });
});
