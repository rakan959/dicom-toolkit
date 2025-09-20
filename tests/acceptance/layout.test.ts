import { describe, it, expect } from "vitest";
import {
  createLayout,
  assignSeriesToViewport,
  getAssignments,
  enableDragRearrange,
} from "@ui/Layout";

// A04-layout acceptance
// @req: F-003

describe("Layout - acceptance", () => {
  it("renders an r×c grid with deterministic viewport ids", () => {
    const root = document.createElement("div");
    const api = createLayout(root, { rows: 2, cols: 2 });
    expect(root.querySelectorAll('[data-test="viewport"]').length).toBe(4);
    const ids = Array.from(root.querySelectorAll('[data-test="viewport"]')).map(
      (el) => (el as HTMLElement).dataset.viewportId,
    );
    expect(ids).toEqual(["0", "1", "2", "3"]);
    // idempotent render
    api.render();
    const ids2 = Array.from(root.querySelectorAll('[data-test="viewport"]')).map(
      (el) => (el as HTMLElement).dataset.viewportId,
    );
    expect(ids2).toEqual(ids);
  });

  it("assigns a series to a viewport and reflects it in DOM and state", () => {
    const root = document.createElement("div");
    const api = createLayout(root, { rows: 1, cols: 3 });
    assignSeriesToViewport(api, 1, { studyInstanceUID: "A", seriesInstanceUID: "S1" });
    const slot = root.querySelector('[data-test="viewport"][data-viewport-id="1"]') as HTMLElement;
    expect(slot.querySelector('[data-test="series-tag"]')!.textContent).toContain("A:S1");
    expect(getAssignments(api)[1]).toEqual({ studyInstanceUID: "A", seriesInstanceUID: "S1" });
  });

  it("drag-to-rearrange swaps assignments between viewports", () => {
    const root = document.createElement("div");
    const api = createLayout(root, { rows: 1, cols: 2 });
    assignSeriesToViewport(api, 0, { studyInstanceUID: "A", seriesInstanceUID: "S1" });
    assignSeriesToViewport(api, 1, { studyInstanceUID: "B", seriesInstanceUID: "S2" });
    enableDragRearrange(api);

    const from = root.querySelector('[data-test="viewport"][data-viewport-id="0"]') as HTMLElement;
    const to = root.querySelector('[data-test="viewport"][data-viewport-id="1"]') as HTMLElement;

    // Simulate drag-drop in jsdom: create generic Event and patch dataTransfer
    const dragStartEv = document.createEvent("Event");
    dragStartEv.initEvent("dragstart", true, true);
    (dragStartEv as any).dataTransfer = {
      store: new Map<string, string>(),
      setData(type: string, val: string) {
        this.store.set(type, val);
      },
      getData(type: string) {
        return this.store.get(type) ?? "";
      },
    } as any;
    from.dispatchEvent(dragStartEv);
    // attach source id on dataTransfer as our impl expects
    const dropEv = document.createEvent("Event");
    dropEv.initEvent("drop", true, true);
    (dropEv as any).dataTransfer = {
      store: new Map<string, string>(),
      setData(type: string, val: string) {
        this.store.set(type, val);
      },
      getData(type: string) {
        return this.store.get(type) ?? "";
      },
    } as any;
    (dropEv as any).dataTransfer.setData("text/plain", "0");
    to.dispatchEvent(dropEv);

    const assigns = getAssignments(api);
    expect(assigns[0]).toEqual({ studyInstanceUID: "B", seriesInstanceUID: "S2" });
    expect(assigns[1]).toEqual({ studyInstanceUID: "A", seriesInstanceUID: "S1" });
  });
});
