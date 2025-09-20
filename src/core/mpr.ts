/** Coordinate transforms for MPR. */
export interface Spacing {
  x: number;
  y: number;
  z: number;
}
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function worldToSlice(
  world: Vec3,
  origin: Vec3,
  spacing: Spacing,
  normal: Vec3,
): { i: number; j: number; k: number } {
  // @req: F-004
  // Minimal axis-aligned implementation: normal must be (0,0,1)
  if (!(Math.abs(normal.x) < 1e-9 && Math.abs(normal.y) < 1e-9 && Math.abs(normal.z - 1) < 1e-9)) {
    throw new Error("Unsupported normal: only axis-aligned (0,0,1) is implemented");
  }
  const dx = world.x - origin.x;
  const dy = world.y - origin.y;
  const dz = world.z - origin.z;
  if (spacing.x === 0 || spacing.y === 0 || spacing.z === 0) {
    throw new Error("Invalid spacing: zero component");
  }
  // Map to voxel indices along i (x), j (y), k (z)
  return {
    i: Math.round(dx / spacing.x),
    j: Math.round(dy / spacing.y),
    k: Math.round(dz / spacing.z),
  };
}

export function sliceToWorld(
  ijk: { i: number; j: number; k: number },
  origin: Vec3,
  spacing: Spacing,
  normal: Vec3,
): Vec3 {
  // @req: F-004
  // Minimal axis-aligned implementation: normal must be (0,0,1)
  if (!(Math.abs(normal.x) < 1e-9 && Math.abs(normal.y) < 1e-9 && Math.abs(normal.z - 1) < 1e-9)) {
    throw new Error("Unsupported normal: only axis-aligned (0,0,1) is implemented");
  }
  if (spacing.x === 0 || spacing.y === 0 || spacing.z === 0) {
    throw new Error("Invalid spacing: zero component");
  }
  return {
    x: origin.x + ijk.i * spacing.x,
    y: origin.y + ijk.j * spacing.y,
    z: origin.z + ijk.k * spacing.z,
  };
}
