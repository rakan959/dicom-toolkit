import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupThumbObserver } from "@src/ui-react/util/thumbnails";

describe("thumbnails setupThumbObserver fallback", () => {
  const realIO = (globalThis as any).IntersectionObserver;
  beforeEach(() => {
    (globalThis as any).IntersectionObserver = undefined;
  });
  afterEach(() => {
    (globalThis as any).IntersectionObserver = realIO;
  });

  it("renders immediately when IntersectionObserver is unavailable", () => {
    const container = document.createElement("div");
    const div = document.createElement("div");
    div.className = "thumb";
    div.setAttribute("data-uid", "SERIES-X");
    container.appendChild(div);

    const renderThumb = vi.fn((uid: string, canvas: HTMLCanvasElement) => {
      expect(uid).toBe("SERIES-X");
      // paint something identifiable
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "red";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    const obs = setupThumbObserver(renderThumb);
    obs.observe(container);

    // Should have replaced the div contents with a canvas immediately
    const canvas = div.querySelector("canvas") as HTMLCanvasElement | null;
    expect(canvas).not.toBeNull();
    obs.disconnect();
  });
});
