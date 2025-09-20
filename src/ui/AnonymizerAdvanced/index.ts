import { Anonymizer } from "@core/anonymizer";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AdvancedAnonymizerUI {
  root: HTMLElement;
  setFrame: (pixels: Uint8Array, width: number, height: number) => void;
  setRectangles: (rects: Rect[]) => void;
  setRedactValue: (v: number) => void;
  getRedactedBuffer: () => Uint8Array;
  render: () => void;
}

function clamp8(n: number): number {
  return Math.min(255, Math.max(0, Math.floor(n)));
}

export function createAdvancedAnonymizerUI(root: HTMLElement): AdvancedAnonymizerUI {
  // Internal state
  let frame = new Uint8Array(0);
  let w = 0;
  let h = 0;
  let rects: Rect[] = [];
  let redactValue = 0;
  const anonymizer = new Anonymizer("advanced");

  const ensureCanvas = (): HTMLCanvasElement => {
    const existing = root.querySelector(
      "canvas[data-test=anon-adv-preview]",
    ) as HTMLCanvasElement | null;
    if (existing) return existing;
    // Build deterministic DOM
    root.innerHTML = "";
    const container = document.createElement("div");
    container.setAttribute("data-test", "anon-adv-ui");
    const canvas = document.createElement("canvas");
    canvas.setAttribute("data-test", "anon-adv-preview");
    canvas.width = Math.max(1, w);
    canvas.height = Math.max(1, h);
    container.appendChild(canvas);
    root.appendChild(container);
    return canvas;
  };

  const draw = () => {
    const canvas = ensureCanvas();
    canvas.width = Math.max(1, w);
    canvas.height = Math.max(1, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Prepare RGBA image from 8-bit grayscale-like data
    const buf = getRedactedBuffer();
    const img = ctx.createImageData(Math.max(1, w), Math.max(1, h));
    for (let i = 0; i < img.data.length; i += 4) {
      const v = buf[i / 4] ?? 0;
      img.data[i + 0] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  };

  const setFrame = (pixels: Uint8Array, width: number, height: number) => {
    frame = new Uint8Array(pixels ?? []);
    w = Math.max(0, Math.floor(width));
    h = Math.max(0, Math.floor(height));
    render();
  };

  const setRectangles = (r: Rect[]) => {
    rects = Array.isArray(r) ? r.map((x) => ({ x: x.x, y: x.y, w: x.w, h: x.h })) : [];
    render();
  };

  const setRedactValue = (v: number) => {
    redactValue = clamp8(v);
    render();
  };

  const getRedactedBuffer = (): Uint8Array => {
    if (w <= 0 || h <= 0 || frame.length === 0) return new Uint8Array(0);
    return anonymizer.redactPixels(frame, w, h, rects, redactValue);
  };

  const render = () => {
    draw();
  };

  // initial render
  render();

  return { root, setFrame, setRectangles, setRedactValue, getRedactedBuffer, render };
}

export default { createAdvancedAnonymizerUI };
