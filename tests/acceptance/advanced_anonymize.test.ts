import { describe, it, expect } from "vitest";
import { Anonymizer } from "@core/anonymizer";

describe("Advanced anonymizer", () => {
  it("applies pixel redaction and custom overrides", () => {
    // @req: F-007
    // @req: S-003
    // Given an advanced anonymizer and an image with headers
    const a = new Anonymizer("advanced");

    // When applying pixel redaction
    const data = new Uint8Array([1, 2, 3, 4]);
    const out = a.redactPixels(data, 2, 2, [{ x: 0, y: 0, w: 1, h: 1 }]);
    // Then the redacted region is zeroed and originals are unchanged
    expect(Array.from(out)).toEqual([0, 2, 3, 4]);
    expect(Array.from(data)).toEqual([1, 2, 3, 4]);

    // Edge case: empty input data -> no throw, returns empty
    expect(
      Array.from(a.redactPixels(new Uint8Array([]), 2, 2, [{ x: 0, y: 0, w: 1, h: 1 }])),
    ).toEqual([]);

    // Edge case: invalid dimensions (zero width) -> no-op
    expect(
      Array.from(a.redactPixels(new Uint8Array([1, 2, 3, 4]), 0, 2, [{ x: 0, y: 0, w: 1, h: 1 }])),
    ).toEqual([1, 2, 3, 4]);

    // Edge case: invalid dimensions (negative height) -> no-op
    expect(
      Array.from(a.redactPixels(new Uint8Array([1, 2, 3, 4]), 2, -1, [{ x: 0, y: 0, w: 1, h: 1 }])),
    ).toEqual([1, 2, 3, 4]);

    // Edge case: rectangle out-of-bounds -> ignored, no throw
    expect(
      Array.from(a.redactPixels(new Uint8Array([1, 2, 3, 4]), 2, 2, [{ x: 3, y: 3, w: 1, h: 1 }])),
    ).toEqual([1, 2, 3, 4]);

    // Edge case: overlapping rectangles -> combined blacking
    const overlapData = new Uint8Array([1, 2, 3, 4]);
    const overlapOut = a.redactPixels(overlapData, 2, 2, [
      { x: 0, y: 0, w: 2, h: 1 },
      { x: 1, y: 0, w: 1, h: 2 },
    ]);
    // Only (0,1) remains since it is not covered by the given rectangles
    expect(Array.from(overlapOut)).toEqual([0, 0, 3, 0]);

    // Also support a configurable redact value
    const rvOut = a.redactPixels(
      new Uint8Array([1, 2, 3, 4]),
      2,
      2,
      [{ x: 1, y: 1, w: 1, h: 1 }],
      99,
    );
    expect(Array.from(rvOut)).toEqual([1, 2, 3, 99]);

    // Edge case: rectangle with zero size -> ignored
    const zeroSizeData = new Uint8Array([1, 2, 3, 4]);
    const zeroSizeOut = a.redactPixels(zeroSizeData, 2, 2, [{ x: 0, y: 0, w: 0, h: 0 }]);
    expect(Array.from(zeroSizeOut)).toEqual([1, 2, 3, 4]);

    // Edge case: rectangle with negative size -> ignored (treated as no-op)
    const negSizeOut = a.redactPixels(new Uint8Array([1, 2, 3, 4]), 2, 2, [
      { x: 0, y: 0, w: -1, h: 1 },
    ]);
    expect(Array.from(negSizeOut)).toEqual([1, 2, 3, 4]);

    // When applying header overrides (case-insensitive keys)
    const headers = { PatientName: "Alice", burnedInAnnotation: "NO" } as Record<string, unknown>;
    const overridden = a.applyOverrides(headers, { patientname: "REDACTED" });
    // Then overridden value is set and non-overridden keys preserved; inputs unchanged
    expect(overridden.PatientName).toBe("REDACTED");
    expect(overridden.burnedInAnnotation).toBe("NO");
    expect(headers.PatientName).toBe("Alice");

    // Overriding a non-existent key (should add the new key)
    const headers2 = { StudyDate: "20220101" } as Record<string, unknown>;
    const overridden2 = a.applyOverrides(headers2, { newkey: "NEWVALUE" });
    expect(overridden2.StudyDate).toBe("20220101");
    expect((overridden2 as any).newkey).toBe("NEWVALUE");
    expect((headers2 as any).newkey).toBeUndefined();

    // Overriding with non-string values
    const headers3 = { NumberValue: 42, ObjValue: { foo: "bar" } } as Record<string, unknown>;
    const overridden3 = a.applyOverrides(headers3, { numbervalue: 100, objvalue: { foo: "baz" } });
    expect(overridden3.NumberValue).toBe(100);
    expect(overridden3.ObjValue).toEqual({ foo: "baz" });
    expect(headers3.NumberValue).toBe(42);
    expect(headers3.ObjValue).toEqual({ foo: "bar" });

    // Empty headers and non-empty overrides
    const headers4 = {} as Record<string, unknown>;
    const overridden4 = a.applyOverrides(headers4, { somekey: "SOMEVALUE" });
    expect((overridden4 as any).somekey).toBe("SOMEVALUE");
    expect(Object.keys(headers4)).toHaveLength(0);

    // Non-empty headers and empty overrides
    const headers5 = { OnlyKey: "OnlyValue" } as Record<string, unknown>;
    const overridden5 = a.applyOverrides(headers5, {});
    expect(overridden5.OnlyKey).toBe("OnlyValue");
    expect(Object.keys(overridden5)).toHaveLength(1);

    // Both headers and overrides empty
    const headers6 = {} as Record<string, unknown>;
    const overridden6 = a.applyOverrides(headers6, {});
    expect(Object.keys(overridden6)).toHaveLength(0);

    // Null/undefined headers and/or overrides handled gracefully
    expect(a.applyOverrides(null as any, { foo: "bar" })).toEqual({ foo: "bar" });
    expect(a.applyOverrides(undefined as any, { foo: "bar" })).toEqual({ foo: "bar" });
    expect(a.applyOverrides({ foo: "bar" }, null as any)).toEqual({ foo: "bar" });
    expect(a.applyOverrides({ foo: "bar" }, undefined as any)).toEqual({ foo: "bar" });
  });
});
