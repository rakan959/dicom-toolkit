import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createAdvancedAnonymizerUI } from "@ui/AnonymizerAdvanced";

describe("Advanced Anonymizer UI properties", () => {
  it("idempotent getRedactedBuffer and render with same inputs", () => {
    // @req: F-007
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        fc.integer({ min: 1, max: 8 }),
        fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 1, maxLength: 64 }),
        (w, h, pixels) => {
          const data = new Uint8Array(w * h);
          for (let i = 0; i < data.length; i++) data[i] = pixels[i % pixels.length]!;
          const root = document.createElement("div");
          const ui = createAdvancedAnonymizerUI(root);
          ui.setFrame(data, w, h);
          ui.setRectangles([
            { x: 0, y: 0, w: Math.max(1, Math.floor(w / 2)), h: Math.max(1, Math.floor(h / 2)) },
          ]);
          const a = Array.from(ui.getRedactedBuffer());
          const html1 = root.innerHTML;
          // Re-render shouldn't change state
          ui.render();
          const b = Array.from(ui.getRedactedBuffer());
          const html2 = root.innerHTML;
          expect(b).toEqual(a);
          expect(html2).toBe(html1);
        },
      ),
    );
  });

  it("rectangle order does not affect result", () => {
    // @req: F-007
    const root = document.createElement("div");
    const ui = createAdvancedAnonymizerUI(root);
    const w = 6,
      h = 6;
    const data = new Uint8Array(w * h).map((_, i) => (i % 251) + 1);
    ui.setFrame(data, w, h);
    const rects = [
      { x: 0, y: 0, w: 2, h: 2 },
      { x: 1, y: 1, w: 2, h: 3 },
      { x: 4, y: 4, w: 2, h: 2 },
    ];
    ui.setRectangles(rects);
    const out1 = Array.from(ui.getRedactedBuffer());
    ui.setRectangles([...rects].reverse());
    const out2 = Array.from(ui.getRedactedBuffer());
    expect(out2).toEqual(out1);
  });
});
