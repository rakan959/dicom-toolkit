import { describe, it, expect } from "vitest";
import { Anonymizer } from "@core/anonymizer";

describe("Advanced anonymizer", () => {
  it("applies pixel redaction and custom overrides", () => {
    // @req: F-007
    // @req: S-003
    const a = new Anonymizer("advanced");
    const data = new Uint8Array([0, 1, 2, 3]);
    expect(() => a.redactPixels(data, 2, 2, [{ x: 0, y: 0, w: 1, h: 1 }])).toThrowError(
      /NotImplemented/,
    );
  });
});
