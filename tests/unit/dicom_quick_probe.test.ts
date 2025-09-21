import { describe, it, expect } from "vitest";
import { isDicomQuickProbe } from "@src/dicom/reader";

describe("isDicomQuickProbe", () => {
  it("detects Part 10 DICM marker", () => {
    const bytes = new Uint8Array(132);
    bytes[128] = 0x44; // D
    bytes[129] = 0x49; // I
    bytes[130] = 0x43; // C
    bytes[131] = 0x4d; // M
    expect(isDicomQuickProbe(bytes)).toBe(true);
  });

  it("detects UID root in early bytes without preamble", () => {
    const text = "random header 1.2.840.10008 more text";
    const enc = new TextEncoder();
    const bytes = enc.encode(text);
    expect(isDicomQuickProbe(bytes)).toBe(true);
  });

  it("returns false for non-DICOM-looking bytes", () => {
    const bytes = new Uint8Array(200);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 13) & 0xff;
    expect(isDicomQuickProbe(bytes)).toBe(false);
  });
});
