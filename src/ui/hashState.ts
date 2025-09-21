import type { SeriesRef } from "./Layout";

export interface LayoutState {
  r: number;
  c: number;
  a: (SeriesRef | null)[];
}

// Produce a hash fragment for a given layout state. Pure function.
export function encodeLayoutState(state: LayoutState): string {
  const safe = {
    r: Math.max(1, Math.floor(state.r || 1)),
    c: Math.max(1, Math.floor(state.c || 1)),
    a: Array.isArray(state.a) ? state.a.map((x) => (x ? { ...x } : null)) : [],
  } as LayoutState;
  const json = JSON.stringify(safe);
  return `#layout=${encodeURIComponent(json)}`;
}

// Parse a layout state from a hash fragment. Returns null if not present/invalid.
export function decodeLayoutState(hash: string): LayoutState | null {
  if (!hash) return null;
  const m = hash.match(/[#&]?layout=([^&]+)/);
  if (!m) return null;
  try {
    const json = decodeURIComponent(m[1]);
    const obj = JSON.parse(json) as LayoutState;
    const r = Math.max(1, Math.floor((obj as any).r || 1));
    const c = Math.max(1, Math.floor((obj as any).c || 1));
    const aRaw = Array.isArray((obj as any).a) ? (obj as any).a : [];
    const a = aRaw.map((x: any) =>
      x &&
      typeof x === "object" &&
      typeof x.studyInstanceUID === "string" &&
      typeof x.seriesInstanceUID === "string"
        ? { studyInstanceUID: x.studyInstanceUID, seriesInstanceUID: x.seriesInstanceUID }
        : null,
    );
    return { r, c, a };
  } catch {
    return null;
  }
}

// Side-effect helpers for convenience in browser contexts
export function updateHashForLayout(state: LayoutState, replace = true): void {
  const frag = encodeLayoutState(state);
  if (typeof window !== "undefined") {
    if (replace && typeof history !== "undefined" && history.replaceState) {
      history.replaceState(null, "", frag);
    } else {
      window.location.hash = frag;
    }
  }
}
