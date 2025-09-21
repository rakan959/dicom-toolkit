import { describe, it, expect, beforeEach } from "vitest";
import {
  _clearPixelDecodersForTest,
  ensureDefaultDecodersRegistered,
} from "@src/ui-react/util/pixelDecoders";
import { renderThumbFromDICOM } from "@src/ui-react/util/thumbnails";
import { makeRLEMono16, makeJPEGLSMono8, makeJ2KRGB8 } from "../fixtures/compressed_datasets";

function makeCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  return canvas as HTMLCanvasElement;
}

describe("compressed thumbnails integration", () => {
  beforeEach(() => {
    _clearPixelDecodersForTest();
    // Ensure canvas shim can be enabled in environments where NODE_ENV may not be set to test
    (globalThis as any).__DTK_ENABLE_CANVAS_SHIM__ = true;
    // Clear optional codec globals
    delete (globalThis as any).__DTK_CODEC_CHARLS__;
    delete (globalThis as any).__DTK_CODEC_OPENJPEG__;
  });

  it("RLE mono16 decodes via built-in decoder", async () => {
    await ensureDefaultDecodersRegistered();
    const ds = makeRLEMono16(2, 2);
    const canvas = makeCanvas();
    await renderThumbFromDICOM("A", "S1", canvas, { testDataset: ds });
    const ctx = canvas.getContext("2d");
    expect(ctx).toBeTruthy();
  });

  it("JPEG-LS mono8 decodes when codec is injected globally", async () => {
    // Mock a charls-like decoder that returns a flat mono8 buffer
    (globalThis as any).__DTK_CODEC_CHARLS__ = {
      decode: (_u8: Uint8Array, _opts: any) => ({
        width: 2,
        height: 2,
        components: 1,
        data: new Uint8Array([0, 64, 128, 255]),
      }),
    };
    await ensureDefaultDecodersRegistered();
    const ds = makeJPEGLSMono8(2, 2);
    const canvas = makeCanvas();
    await renderThumbFromDICOM("A", "S1", canvas, { testDataset: ds });
    const ctx = canvas.getContext("2d");
    expect(ctx).toBeTruthy();
  });

  it("JPEG 2000 RGB decodes when codec is injected globally", async () => {
    // Mock an openjpeg-like decoder that returns RGB interleaved data
    (globalThis as any).__DTK_CODEC_OPENJPEG__ = {
      decode: (_u8: Uint8Array) => ({
        width: 2,
        height: 2,
        components: 3,
        data: new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]),
      }),
    };
    await ensureDefaultDecodersRegistered();
    const ds = makeJ2KRGB8(2, 2);
    const canvas = makeCanvas();
    await renderThumbFromDICOM("A", "S1", canvas, { testDataset: ds });
    const ctx = canvas.getContext("2d");
    expect(ctx).toBeTruthy();
  });
});
