import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@src/utils/zipLoader", () => ({
  expandZipBytes: vi.fn(),
}));

import { expandZipBytes } from "@src/utils/zipLoader";
import { iterateZipEntries, type Skipped } from "@src/import/zipCentral";

describe("iterateZipEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("yields only DICOM-looking entries and reports progress", async () => {
    const expand = expandZipBytes as unknown as ReturnType<typeof vi.fn>;
    // Compose entries: one with DICM marker, one with UID root string, one invalid, one oversized
    const dicm = new Uint8Array(132);
    dicm[128] = 0x44;
    dicm[129] = 0x49;
    dicm[130] = 0x43;
    dicm[131] = 0x4d;
    const uid = new TextEncoder().encode("1.2.840.10008");
    const bad = new Uint8Array([1, 2, 3, 4]);
    const big = new Uint8Array(1024 * 1024 + 1);
    expand.mockResolvedValue([
      { name: "a.dcm", bytes: dicm },
      { name: "b.bin", bytes: uid },
      { name: "c.dat", bytes: bad },
      { name: "d.huge", bytes: big },
    ]);

    const yielded: Array<{ name: string } | { skip: Skipped }> = [];
    const prog: Array<{ entriesSeen: number; kept: number }> = [];

    for await (const item of iterateZipEntries(new Uint8Array([0]), {
      maxEntryBytes: 1024 * 1024,
      onProgress: (p) => prog.push(p),
      onSkip: (_s) => {
        /* callback observed; we assert on yielded items to avoid double counting */
      },
    })) {
      yielded.push(item as any);
    }

    // We expect kept a.dcm and b.bin (UID root), skip c.dat (not-dicom) and d.huge (size-cap)
    const kept = yielded.filter((x: any) => !("skip" in x)) as Array<{ name: string }>;
    const skips = yielded.filter((x: any) => "skip" in x) as Array<{ skip: Skipped }>;
    expect(kept.map((k) => k.name)).toEqual(["a.dcm", "b.bin"]);
    expect(skips.map((s) => s.skip.reason).sort()).toEqual(["not-dicom", "size-cap"]);
    // Progress should have been reported at least once
    expect(prog.length).toBeGreaterThan(0);
    // Final progress kept should be 2
    expect(prog[prog.length - 1].kept).toBe(2);
  });
});
