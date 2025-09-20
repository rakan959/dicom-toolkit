/** Coordinate transforms for MPR. */
export interface Spacing { x: number; y: number; z: number; }
export interface Vec3 { x: number; y: number; z: number; }

export function worldToSlice(_world: Vec3, _origin: Vec3, _spacing: Spacing, _normal: Vec3): { i: number; j: number; k: number } {
  // @req: F-004
  throw new Error("NotImplemented: worldToSlice");
}

export function sliceToWorld(_ijk: { i: number; j: number; k: number }, _origin: Vec3, _spacing: Spacing, _normal: Vec3): Vec3 {
  // @req: F-004
  throw new Error("NotImplemented: sliceToWorld");
}
