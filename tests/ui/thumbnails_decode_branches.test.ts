import { describe, it, expect } from "vitest";
import { decodeIntoImageData, type DicomDatasetLite } from "@src/ui-react/util/thumbnails";

function makeCanvasImageData(w: number, h: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d ctx");
  return ctx.createImageData(w, h);
}

function rgb(r: number, g: number, b: number) {
  return [r, g, b, 255] as const;
}

describe("thumbnails decode branches", () => {
  it("renders 16-bit mono with slope/intercept and WC/WW", () => {
    const rows = 2,
      cols = 2;
    // Uint16 pixel values: [0, 1000, 2000, 3000]
    const pixel = new Uint16Array([0, 1000, 2000, 3000]);
    const ds: DicomDatasetLite = {
      rows,
      cols,
      bitsAllocated: 16,
      samplesPerPixel: 1,
      planarConfiguration: 0,
      photometricInterpretation: "MONOCHROME2",
      windowCenter: 1500,
      windowWidth: 2000,
      rescaleSlope: 1,
      rescaleIntercept: 0,
      pixel,
    };
    const img = makeCanvasImageData(cols, rows);
    const ok = decodeIntoImageData(ds, img);
    expect(ok).toBe(true);
    // Simple monotonic check: values should increase across pixels
    const v = (i: number) => img.data[i * 4];
    expect(v(0)).toBeLessThanOrEqual(v(1));
    expect(v(1)).toBeLessThanOrEqual(v(2));
    expect(v(2)).toBeLessThanOrEqual(v(3));
  });

  it("applies MONOCHROME1 inversion on 8-bit", () => {
    const rows = 1,
      cols = 3;
    const pixel = new Uint8Array([0, 127, 255]);
    const ds: DicomDatasetLite = {
      rows,
      cols,
      bitsAllocated: 8,
      samplesPerPixel: 1,
      planarConfiguration: 0,
      photometricInterpretation: "MONOCHROME1",
      pixel,
      windowCenter: undefined,
      windowWidth: undefined,
      rescaleSlope: undefined,
      rescaleIntercept: undefined,
    } as any;
    const img = makeCanvasImageData(cols, rows);
    const ok = decodeIntoImageData(ds, img);
    expect(ok).toBe(true);
    // Inversion: 0 -> 255, 127 -> ~128, 255 -> 0
    expect(img.data[0]).toBe(255);
    expect(img.data[4]).toBeGreaterThan(120);
    expect(img.data[8]).toBe(0);
  });

  it("decodes RGB interleaved", () => {
    const rows = 1,
      cols = 2;
    // Pixels: (255,0,0), (0,0,255)
    const pixel = new Uint8Array([255, 0, 0, 0, 0, 255]);
    const ds: DicomDatasetLite = {
      rows,
      cols,
      bitsAllocated: 8,
      samplesPerPixel: 3,
      planarConfiguration: 0,
      photometricInterpretation: "RGB",
      pixel,
    } as any;
    const img = makeCanvasImageData(cols, rows);
    const ok = decodeIntoImageData(ds, img);
    expect(ok).toBe(true);
    expect(Array.from(img.data.slice(0, 4))).toEqual(Array.from(rgb(255, 0, 0)));
    expect(Array.from(img.data.slice(4, 8))).toEqual(Array.from(rgb(0, 0, 255)));
  });

  it("decodes YBR_FULL interleaved (gray center)", () => {
    const rows = 1,
      cols = 1;
    // Y=128 Cb=128 Cr=128 should be neutral gray ~128
    const pixel = new Uint8Array([128, 128, 128]);
    const ds: DicomDatasetLite = {
      rows,
      cols,
      bitsAllocated: 8,
      samplesPerPixel: 3,
      planarConfiguration: 0,
      photometricInterpretation: "YBR_FULL",
      pixel,
    } as any;
    const img = makeCanvasImageData(cols, rows);
    const ok = decodeIntoImageData(ds, img);
    expect(ok).toBe(true);
    const val = img.data[0];
    expect(val).toBeGreaterThanOrEqual(120);
    expect(val).toBeLessThanOrEqual(136);
  });

  it("decodes RGB planar", () => {
    const rows = 1,
      cols = 2;
    // Planar: RR.. GG.. BB.. -> (10,20,30) (40,50,60)
    const R = [10, 40];
    const G = [20, 50];
    const B = [30, 60];
    const pixel = new Uint8Array([...R, ...G, ...B]);
    const ds: DicomDatasetLite = {
      rows,
      cols,
      bitsAllocated: 8,
      samplesPerPixel: 3,
      planarConfiguration: 1,
      photometricInterpretation: "RGB",
      pixel,
    } as any;
    const img = makeCanvasImageData(cols, rows);
    const ok = decodeIntoImageData(ds, img);
    expect(ok).toBe(true);
    expect(Array.from(img.data.slice(0, 4))).toEqual(Array.from(rgb(10, 20, 30)));
    expect(Array.from(img.data.slice(4, 8))).toEqual(Array.from(rgb(40, 50, 60)));
  });

  it("decodes YBR_FULL planar (gray center)", () => {
    const rows = 1,
      cols = 1;
    const Y = [128];
    const Cb = [128];
    const Cr = [128];
    const pixel = new Uint8Array([...Y, ...Cb, ...Cr]);
    const ds: DicomDatasetLite = {
      rows,
      cols,
      bitsAllocated: 8,
      samplesPerPixel: 3,
      planarConfiguration: 1,
      photometricInterpretation: "YBR_FULL",
      pixel,
    } as any;
    const img = makeCanvasImageData(cols, rows);
    const ok = decodeIntoImageData(ds, img);
    expect(ok).toBe(true);
    const val = img.data[0];
    expect(val).toBeGreaterThanOrEqual(120);
    expect(val).toBeLessThanOrEqual(136);
  });
});
