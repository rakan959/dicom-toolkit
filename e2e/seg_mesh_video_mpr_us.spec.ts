import { test, expect } from "@playwright/test";

// This suite validates core feature surfaces via the window test hook and UI for US modality
// - SEG import/export round-trip (F-010)
// - Mesh export empty labelmap status (F-011)
// - Video export minimal EBML bytes (F-012, F-013)
// - MPR transforms (F-004) basic axis-aligned
// - Ultrasound modality detection via ingest heuristics (US) (from seriesStore)

function b64FromBytes(bytes: Uint8Array): string {
  // Convenience for transporting small buffers across evaluate boundaries if needed
  return Buffer.from(bytes).toString("base64");
}

test.describe("Core surfaces via window hook + UI", () => {
  test("SEG import/export, Mesh empty, Video export, MPR transforms", async ({ page }) => {
    const base = process.env.E2E_BASE_URL || "http://localhost:4173";
    await page.goto(base);

    const out = await page.evaluate(() => {
      const api = (window as any).__DTK;
      // SEG round-trip: 3x3x1 with a brushed center
      const painted = new Uint8Array(9);
      // Simple circle: mark center and its 4-neighbors manually
      painted[4] = 1; // center
      const bytes = api.exportSEG(painted, [3, 3, 1]);
      const seg = api.importSEG(bytes);

      // Mesh empty
      const mesh = api.meshFromLabelmap(new Uint8Array(), [1, 1, 1], [1, 1, 1]);

      // Video export with explicit dims and no frames
      return {
        segDims: seg.dims as [number, number, number],
        segSegments: seg.segments as number,
        segEqual: Array.from(seg.labelmap) as number[],
        meshEmpty: mesh.status,
      };
    });

    expect(out.segDims).toEqual([3, 3, 1]);
    expect(out.segSegments).toBeGreaterThanOrEqual(1);
    expect(out.segEqual).toHaveLength(9);
    expect(out.meshEmpty).toBe("empty_labelmap");

    // Video export in a separate evaluate to check EBML magic and size
    const vid = await page.evaluate(() => {
      const api = (window as any).__DTK;
      return api
        .exportVideo([], { target: "layout", width: 2, height: 2 })
        .then((u8: Uint8Array) => ({
          head: Array.from(u8.slice(0, 4)),
          len: u8.byteLength,
        }));
    });
    expect(vid.head).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
    expect(vid.len).toBeGreaterThanOrEqual(64);

    // MPR transforms axis-aligned
    const m = await page.evaluate(() => {
      const api = (window as any).__DTK;
      const origin = { x: 0, y: 0, z: 0 };
      const spacing = { x: 1, y: 1, z: 2 };
      const normal = { x: 0, y: 0, z: 1 };
      const ijk = api.mpr.worldToSlice({ x: 2, y: 3, z: 4 }, origin, spacing, normal);
      const world = api.mpr.sliceToWorld(ijk, origin, spacing, normal);
      return { ijk, world };
    });
    expect(m.ijk).toEqual({ i: 2, j: 3, k: 2 });
    expect(m.world).toEqual({ x: 2, y: 3, z: 4 });
  });

  test("Ultrasound modality detected via ingest heuristics and displayed in Series Panel", async ({
    page,
  }) => {
    const base = process.env.E2E_BASE_URL || "http://localhost:4173";
    await page.goto(base);

    // Build a fake US series with DICM magic and filenames encoding mod-US
    function mkDicomBytes(): Uint8Array {
      const buf = new Uint8Array(200);
      buf[128] = 0x44; // D
      buf[129] = 0x49; // I
      buf[130] = 0x43; // C
      buf[131] = 0x4d; // M
      return buf;
    }

    // Create 1 file in the browser context and drop it on the drop zone
    await page.evaluate(() => {
      // ensure drop zone exists
    });
    const dropZone = page.locator('[data-test="drop-zone"], label.drop-bar');
    await expect(dropZone.first()).toBeVisible();

    const dt = await page.evaluateHandle(() => new DataTransfer());
    const fileHandle = await page.evaluateHandle((bytesB64: string) => {
      const bin = Uint8Array.from(atob(bytesB64), (c) => c.charCodeAt(0));
      const ab = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
      return new File([ab], "study-U_series-UX_inst-I1_frames-5_mod-US.dcm", {
        type: "application/dicom",
      });
    }, b64FromBytes(mkDicomBytes()));
    await page.evaluate(
      ({ dt, file }: any) => {
        (dt as DataTransfer).items.add(file as File);
      },
      { dt, file: fileHandle },
    );

    const zoneEl = await dropZone.elementHandle();
    await page.evaluate(
      ({ element, handle }: { element: Element; handle: DataTransfer }) => {
        const el = element as HTMLElement;
        const dt = handle;
        el.dispatchEvent(
          new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }),
        );
        el.dispatchEvent(
          new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }),
        );
      },
      { element: zoneEl!, handle: dt as unknown as any },
    );

    // Expect the Series Panel to show a US modality line for the new series
    const item = page.locator('[data-test="series-item"][data-series-uid="UX"]');
    await expect(item).toBeVisible();
    await expect(item.locator(".line1")).toContainText("US");
  });
});
