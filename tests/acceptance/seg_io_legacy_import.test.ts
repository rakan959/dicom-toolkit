import { describe, it, expect } from "vitest";
import { importSEG } from "@core/segmentation";

describe("SEG IO legacy JSON import (no preamble) - acceptance (A08-seg-io)", () => {
  it("imports SEG-MIN-1 JSON without preamble (no UIDs)", () => {
    // @req: F-010
    const w = 2,
      h = 2,
      d = 1 as const;
    const data = new Uint8Array([0, 1, 2, 0]);
    const payload = {
      _format: "SEG-MIN-1",
      dims: [w, h, d],
      segments: 2,
      data: btoa(String.fromCharCode(...data)),
    };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const seg = importSEG(bytes);
    expect(seg.dims).toEqual([w, h, d]);
    expect(seg.segments).toBe(2);
    expect(Array.from(seg.labelmap)).toEqual(Array.from(data));
    expect(seg.SeriesInstanceUID ?? null).toBeNull();
    expect(seg.FrameOfReferenceUID ?? null).toBeNull();
  });

  it("imports SEG-MIN-1 JSON without preamble (with UIDs)", () => {
    // @req: F-010
    const w = 2,
      h = 2,
      d = 1 as const;
    const data = new Uint8Array([1, 1, 0, 0]);
    const SeriesInstanceUID = "1.2.840.10008.1.2.3";
    const FrameOfReferenceUID = "2.25.42";
    const payload = {
      _format: "SEG-MIN-1",
      dims: [w, h, d],
      segments: 1,
      data: btoa(String.fromCharCode(...data)),
      SeriesInstanceUID,
      FrameOfReferenceUID,
    };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const seg = importSEG(bytes) as any;
    expect(seg.dims).toEqual([w, h, d]);
    expect(seg.segments).toBe(1);
    expect(Array.from(seg.labelmap)).toEqual(Array.from(data));
    expect(seg.SeriesInstanceUID).toBe(SeriesInstanceUID);
    expect(seg.FrameOfReferenceUID).toBe(FrameOfReferenceUID);
  });
});
