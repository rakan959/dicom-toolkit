/** Minimal segmentation core primitives. */
export type Tool = "brush" | "threshold" | "region" | "lasso";

export function applyBrush(
  _labelmap: Uint8Array,
  _w: number,
  _h: number,
  _stroke: { x: number; y: number; r: number },
): Uint8Array {
  // @req: F-009
  throw new Error("NotImplemented: applyBrush");
}

export function importSEG(_segBytes: Uint8Array): { segments: number } {
  // @req: F-010
  throw new Error("NotImplemented: importSEG");
}

export function exportSEG(_labelmap: Uint8Array, _dims: [number, number, number]): Uint8Array {
  // @req: F-010
  throw new Error("NotImplemented: exportSEG");
}
