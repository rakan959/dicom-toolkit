import { describe, it, expect } from "vitest";
import { exportSEG, importSEG } from "@core/segmentation";

describe("SEG IO error-cases", () => {
  it("throws on empty bytes for importSEG", () => {
    // @req: F-010
    expect(() => importSEG(new Uint8Array())).toThrow();
  });

  it("throws on unknown payload format", () => {
    // @req: F-010
    const payload = new TextEncoder().encode(
      JSON.stringify({ _format: "NOT-SEG", dims: [1, 1, 1], data: "" }),
    );
    const preamble = new Uint8Array(132);
    preamble[128] = 0x44; // D
    preamble[129] = 0x49; // I
    preamble[130] = 0x43; // C
    preamble[131] = 0x4d; // M
    const bytes = new Uint8Array(preamble.length + payload.length);
    bytes.set(preamble, 0);
    bytes.set(payload, preamble.length);
    expect(() => importSEG(bytes)).toThrow();
  });

  it("throws on invalid dims (not length 3)", () => {
    // @req: F-010
    const data = new Uint8Array([1]);
    const payload = {
      _format: "SEG-MIN-1",
      dims: [1, 1],
      data: btoa(String.fromCharCode(...data)),
    };
    const json = new TextEncoder().encode(JSON.stringify(payload));
    const preamble = new Uint8Array(132);
    preamble[128] = 0x44;
    preamble[129] = 0x49;
    preamble[130] = 0x43;
    preamble[131] = 0x4d;
    const bytes = new Uint8Array(preamble.length + json.length);
    bytes.set(preamble, 0);
    bytes.set(json, preamble.length);
    expect(() => importSEG(bytes)).toThrow();
  });

  it("throws on size mismatch during importSEG", () => {
    // @req: F-010
    // dims say 2x2x1=4 but only provide 3 values
    const data = new Uint8Array([1, 2, 3]);
    const payload = {
      _format: "SEG-MIN-1",
      dims: [2, 2, 1],
      data: btoa(String.fromCharCode(...data)),
    };
    const json = new TextEncoder().encode(JSON.stringify(payload));
    const preamble = new Uint8Array(132);
    preamble[128] = 0x44;
    preamble[129] = 0x49;
    preamble[130] = 0x43;
    preamble[131] = 0x4d;
    const bytes = new Uint8Array(preamble.length + json.length);
    bytes.set(preamble, 0);
    bytes.set(json, preamble.length);
    expect(() => importSEG(bytes)).toThrow();
  });

  it("exportSEG throws on empty labelmap", () => {
    // @req: F-010
    expect(() => exportSEG(new Uint8Array(), [1, 1, 1])).toThrow();
  });

  it("exportSEG throws on size mismatch", () => {
    // @req: F-010
    const data = new Uint8Array([1, 2, 3]);
    expect(() => exportSEG(data, [2, 2, 1])).toThrow();
  });
});
