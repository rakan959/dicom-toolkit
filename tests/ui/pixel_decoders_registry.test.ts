import { describe, it, expect, beforeEach } from "vitest";
import {
  registerPixelDecoder,
  tryDecodePixelData,
  _clearPixelDecodersForTest,
  type DecodedPixel,
} from "@src/ui-react/util/pixelDecoders";

describe("pixelDecoders registry", () => {
  beforeEach(() => {
    _clearPixelDecodersForTest();
  });

  it("returns undefined when no decoders are registered", async () => {
    const res = await tryDecodePixelData(new ArrayBuffer(0), {});
    expect(res).toBeUndefined();
  });

  it("returns first successful decoder result and skips undefined", async () => {
    registerPixelDecoder(() => undefined);
    registerPixelDecoder(
      () =>
        ({
          pixel: new Uint8Array([1, 2, 3]),
          bitsAllocated: 8,
          samplesPerPixel: 1,
          planarConfiguration: 0,
        }) satisfies DecodedPixel,
    );
    const res = await tryDecodePixelData(new ArrayBuffer(0), {});
    expect(res).toBeDefined();
    expect(res!.bitsAllocated).toBe(8);
    expect(res!.samplesPerPixel).toBe(1);
    expect(res!.pixel).instanceOf(Uint8Array);
  });

  it("ignores decoders that throw and continues to next", async () => {
    registerPixelDecoder(() => {
      throw new Error("boom");
    });
    registerPixelDecoder(
      () =>
        ({
          pixel: new Uint16Array([0, 1024, 4095]),
          bitsAllocated: 16,
          samplesPerPixel: 1,
          planarConfiguration: 0,
        }) satisfies DecodedPixel,
    );
    const res = await tryDecodePixelData(new ArrayBuffer(0), {});
    expect(res).toBeDefined();
    expect(res!.bitsAllocated).toBe(16);
    expect(res!.pixel).instanceOf(Uint16Array);
  });

  it("passes through planarConfiguration when provided", async () => {
    registerPixelDecoder(
      () =>
        ({
          pixel: new Uint8Array([255, 0, 0, 0, 255, 0]),
          bitsAllocated: 8,
          samplesPerPixel: 3,
          planarConfiguration: 1,
        }) satisfies DecodedPixel,
    );
    const res = await tryDecodePixelData(new ArrayBuffer(0), {});
    expect(res).toBeDefined();
    expect(res!.samplesPerPixel).toBe(3);
    expect(res!.planarConfiguration).toBe(1);
  });

  it("can be cleared for tests using _clearPixelDecodersForTest", async () => {
    registerPixelDecoder(
      () =>
        ({
          pixel: new Uint8Array([1]),
          bitsAllocated: 8,
          samplesPerPixel: 1,
          planarConfiguration: 0,
        }) satisfies DecodedPixel,
    );
    let res = await tryDecodePixelData(new ArrayBuffer(0), {});
    expect(res).toBeDefined();
    _clearPixelDecodersForTest();
    res = await tryDecodePixelData(new ArrayBuffer(0), {});
    expect(res).toBeUndefined();
  });
});
