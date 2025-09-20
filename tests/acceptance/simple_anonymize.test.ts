import { describe, it, expect } from "vitest";
import { Anonymizer } from "@core/anonymizer";

describe("Simple anonymizer", () => {
  it("uses per-session stable random mapping and drops burned-in PHI", () => {
    // @req: F-006
    // @req: S-001
    // @req: S-002
    const a = new Anonymizer("simple");
    const a1 = a.mapPHI("John^Doe");
    const a2 = a.mapPHI("John^Doe");
    expect(a1).toBe(a2);
    expect(a1).not.toBe("John^Doe");
    // Drop when BurnedInAnnotation is truthy
    expect(a.shouldDropForBurnedInPHI({ BurnedInAnnotation: "YES" })).toBe(true);
    expect(a.shouldDropForBurnedInPHI({ burnedinannotation: "yes" })).toBe(true);
    expect(a.shouldDropForBurnedInPHI({ BurnedInAnnotation: true })).toBe(true);
    expect(a.shouldDropForBurnedInPHI({ BurnedInAnnotation: 1 })).toBe(true);
    // Keep otherwise
    expect(a.shouldDropForBurnedInPHI({ BurnedInAnnotation: "NO" })).toBe(false);
    expect(a.shouldDropForBurnedInPHI({})).toBe(false);

    // Unexpected types
    expect(a.shouldDropForBurnedInPHI({ BurnedInAnnotation: {} as any })).toBe(false);
    expect(a.shouldDropForBurnedInPHI({ BurnedInAnnotation: [] as any })).toBe(false);
  });

  it("preserves pixel data in simple mode (no redaction)", () => {
    // @req: F-006
    const a = new Anonymizer("simple");
    const pixels = new Uint8Array([0, 1, 2, 3]);
    const out = a.redactPixels(pixels, 2, 2, [{ x: 0, y: 0, w: 1, h: 1 }]);
    expect(out).toBe(pixels);
  });
});
