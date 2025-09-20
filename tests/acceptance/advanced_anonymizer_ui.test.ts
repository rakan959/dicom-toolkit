import { describe, it, expect } from "vitest";
import { createAdvancedAnonymizerUI } from "@ui/AnonymizerAdvanced";

// A03-advanced-anon (UI preview)
describe("Advanced Anonymizer UI preview", () => {
  it("renders a preview and applies redaction without mutating inputs", () => {
    // @req: F-007
    const root = document.createElement("div");
    const ui = createAdvancedAnonymizerUI(root);

    // Given a 2x2 frame with values 1..4
    const frame = new Uint8Array([1, 2, 3, 4]);
    ui.setFrame(frame, 2, 2);
    // When we set a redaction rectangle covering bottom-right pixel
    ui.setRectangles([{ x: 1, y: 1, w: 1, h: 1 }]);
    // Then the preview's redacted buffer has 99 at bottom-right if set, default 0 otherwise
    const outDefault = ui.getRedactedBuffer();
    expect(Array.from(outDefault)).toEqual([1, 2, 3, 0]);
    // And input buffer is unchanged
    expect(Array.from(frame)).toEqual([1, 2, 3, 4]);

    // When we change redact value
    ui.setRedactValue(99);
    const outRv = ui.getRedactedBuffer();
    expect(Array.from(outRv)).toEqual([1, 2, 3, 99]);

    // It re-renders deterministically
    const firstHtml = root.innerHTML;
    ui.render();
    expect(root.innerHTML).toBe(firstHtml);
  });

  it("ignores invalid rects and handles empty input gracefully", () => {
    // @req: F-007
    const root = document.createElement("div");
    const ui = createAdvancedAnonymizerUI(root);
    ui.setFrame(new Uint8Array([]), 0, 0);
    ui.setRectangles([{ x: 0, y: 0, w: 0, h: 0 }]);
    const out = ui.getRedactedBuffer();
    expect(Array.from(out)).toEqual([]);
  });
});
