import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import dcmjs from "dcmjs";
import { renderThumbFromDICOM } from "@src/ui-react/util/thumbnails";
import { ensureDefaultDecodersRegistered } from "@src/ui-react/util/pixelDecoders";

function makeCanvas() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  // enable shim if needed
  (globalThis as any).__DTK_ENABLE_CANVAS_SHIM__ = true;
  return c as HTMLCanvasElement;
}

function readDicomDataset(p: string) {
  const bytes = readFileSync(p);
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const dicomData = dcmjs.data.DicomMessage.readFile(ab as ArrayBuffer);
  return dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);
}

describe("compressed thumbnails with real assets (optional)", () => {
  const base = resolve(process.cwd(), "tests", "assets", "compressed");
  const rlePath = resolve(base, "rle_mono16_small.dcm");
  const jlsPath = resolve(base, "jpegls_mono8_small.dcm");
  const j2kPath = resolve(base, "j2k_rgb8_small.dcm");

  it.runIf(existsSync(rlePath))("RLE mono16 renders via built-in decoder", async () => {
    await ensureDefaultDecodersRegistered();
    const ds = readDicomDataset(rlePath);
    const canvas = makeCanvas();
    await renderThumbFromDICOM("A", "S1", canvas, { testDataset: ds });
    expect(canvas.getContext("2d")).toBeTruthy();
  });

  it.runIf(existsSync(jlsPath))(
    "JPEG-LS renders when codec is available, otherwise falls back gracefully",
    async () => {
      await ensureDefaultDecodersRegistered();
      const ds = readDicomDataset(jlsPath);
      const canvas = makeCanvas();
      await renderThumbFromDICOM("A", "S1", canvas, { testDataset: ds });
      expect(canvas.getContext("2d")).toBeTruthy();
    },
  );

  it.runIf(existsSync(j2kPath))(
    "JPEG 2000 renders when codec is available, otherwise falls back gracefully",
    async () => {
      await ensureDefaultDecodersRegistered();
      const ds = readDicomDataset(j2kPath);
      const canvas = makeCanvas();
      await renderThumbFromDICOM("A", "S1", canvas, { testDataset: ds });
      expect(canvas.getContext("2d")).toBeTruthy();
    },
  );
});
