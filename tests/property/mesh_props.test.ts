import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { meshFromLabelmap } from "@core/mesh";

describe("P-mesh properties", () => {
  it("empty labelmaps always yield empty buffers (@req: F-011)", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 1, max: 6 }),
          fc.integer({ min: 1, max: 6 }),
          fc.integer({ min: 1, max: 6 }),
        ),
        fc.tuple(
          fc.float({ min: Math.fround(0.125), max: Math.fround(3) }),
          fc.float({ min: Math.fround(0.125), max: Math.fround(3) }),
          fc.float({ min: Math.fround(0.125), max: Math.fround(3) }),
        ),
        (dims, spacing) => {
          const [dx, dy, dz] = dims as [number, number, number];
          const lm = new Uint8Array(dx * dy * dz); // all zeros
          const { stl, glb, status } = meshFromLabelmap(lm, [dx, dy, dz], spacing as any);
          expect(stl.byteLength).toBe(0);
          expect(glb.byteLength).toBe(0);
          expect(status).toBe("empty_labelmap");
        },
      ),
    );
  });
});
