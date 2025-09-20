export type ViewportId = number;

export interface LayoutOptions {
  rows: number;
  cols: number;
}

export interface SeriesRef {
  studyInstanceUID: string;
  seriesInstanceUID: string;
}

export interface LayoutAPI {
  render: () => void;
  root: HTMLElement;
  rows: number;
  cols: number;
  _assignments: (SeriesRef | null)[];
}

function clampGrid(r: number, c: number): { r: number; c: number } {
  return { r: Math.max(1, Math.floor(r)), c: Math.max(1, Math.floor(c)) };
}

export function createLayout(root: HTMLElement, opts: LayoutOptions): LayoutAPI {
  const { r, c } = clampGrid(opts.rows, opts.cols);
  const assignments: (SeriesRef | null)[] = new Array(r * c).fill(null);

  const api: LayoutAPI = {
    render: () => renderGrid(root, r, c, assignments),
    root,
    rows: r,
    cols: c,
    _assignments: assignments,
  };

  api.render();
  return api;
}

function renderGrid(root: HTMLElement, rows: number, cols: number, assigns: (SeriesRef | null)[]) {
  // idempotent: rebuild deterministic DOM
  root.innerHTML = "";
  const container = document.createElement("div");
  container.setAttribute("data-test", "layout");
  container.style.display = "grid";
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  for (let i = 0; i < rows * cols; i++) {
    const vp = document.createElement("div");
    vp.setAttribute("data-test", "viewport");
    vp.setAttribute("data-viewport-id", String(i));
    vp.style.border = "1px solid #ccc";
    vp.style.minHeight = "40px";
    const tag = document.createElement("span");
    tag.setAttribute("data-test", "series-tag");
    const s = assigns[i];
    tag.textContent = s ? `${s.studyInstanceUID}:${s.seriesInstanceUID}` : "(empty)";
    vp.appendChild(tag);
    container.appendChild(vp);
  }
  root.appendChild(container);
}

export function assignSeriesToViewport(api: LayoutAPI, viewportId: ViewportId, ref: SeriesRef): void {
  if (viewportId < 0 || viewportId >= api._assignments.length) {
    console.warn(
      `assignSeriesToViewport: Invalid viewportId (${viewportId}) provided. Valid range is 0 to ${api._assignments.length - 1}.`
    );
    return;
  }
  api._assignments[viewportId] = { ...ref };
  api.render();
}

export function getAssignments(api: LayoutAPI): (SeriesRef | null)[] {
  return api._assignments.slice();
}

export function swapViewports(api: LayoutAPI, a: ViewportId, b: ViewportId): void {
  const n = api._assignments.length;
  if (a < 0 || b < 0 || a >= n || b >= n || a === b) return;
  const tmp = api._assignments[a];
  api._assignments[a] = api._assignments[b];
  api._assignments[b] = tmp;
  api.render();
}

export function enableDragRearrange(api: LayoutAPI): void {
  // Minimal drag-drop that swaps when a viewport gets a drop with source id in dataTransfer
  const vps = api.root.querySelectorAll('[data-test="viewport"]');
  vps.forEach((vp) => {
    const el = vp as HTMLElement;
    // Avoid attaching duplicate listeners if called multiple times without re-render
    if (el.getAttribute("data-dnd-bound") === "1") return;
    el.setAttribute("data-dnd-bound", "1");
    el.draggable = true;
    el.addEventListener("dragstart", (ev) => {
      const id = el.getAttribute("data-viewport-id") ?? "";
      ev.dataTransfer?.setData("text/plain", id);
    });
    el.addEventListener("dragover", (ev) => {
      ev.preventDefault();
    });
    el.addEventListener("drop", (ev) => {
      ev.preventDefault();
  const fromStr = ev.dataTransfer?.getData("text/plain");
  const from = fromStr ? Number(fromStr) : NaN;
  const to = Number(el.getAttribute("data-viewport-id") ?? "NaN");
      if (!Number.isNaN(from) && !Number.isNaN(to)) {
        if (from === to) return; // no-op on self-drop
        swapViewports(api, from, to);
      }
    });
  });
}

export default {
  createLayout,
  assignSeriesToViewport,
  getAssignments,
  swapViewports,
  enableDragRearrange,
};
