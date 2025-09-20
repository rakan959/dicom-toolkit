import { describe, it, expect } from "vitest";
import { meshFromLabelmap } from "@core/mesh";

describe("A09-mesh – Mesh exports STL and GLB", () => {
  it("returns empty buffers for empty labelmap (@req: F-011)", () => {
    const { stl, glb, status } = meshFromLabelmap(new Uint8Array(8), [2, 2, 2], [1, 1, 1]);
    expect(stl.byteLength).toBe(0);
    expect(glb.byteLength).toBe(0);
    expect(status).toBe("empty_labelmap");
  });

  it("creates a cuboid mesh covering labeled voxels with spacing (@req: F-011)", () => {
    // label a single voxel at center
    const dims: [number, number, number] = [3, 3, 3];
    const spacing: [number, number, number] = [0.5, 1, 2];
    const lm = new Uint8Array(dims[0] * dims[1] * dims[2]);
    const idx = (x: number, y: number, z: number) => x + dims[0] * (y + dims[1] * z);
    lm[idx(1, 1, 1)] = 1;
    const { stl, glb } = meshFromLabelmap(lm, dims, spacing);
    // Binary STL: 80-byte header + 4-byte triangle count + 50 bytes per triangle (12 triangles for a cuboid)
    expect(stl.byteLength).toBe(80 + 4 + 50 * 12);
    // triangle count stored at offset 80 as little-endian uint32
    const triCount = new DataView(stl.buffer, stl.byteOffset + 80, 4).getUint32(0, true);
    expect(triCount).toBe(12);
    // GLB: should start with magic 'glTF' and version 2
    const dv = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
    // magic 'glTF' = 0x46546C67 little-endian in bytes
    expect(dv.getUint32(0, true)).toBe(0x46546c67);
    expect(dv.getUint32(4, true)).toBe(2);
  });
});
