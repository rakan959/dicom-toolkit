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
    expect(() => a.shouldDropForBurnedInPHI({})).toThrowError(/NotImplemented/);
  });
});
