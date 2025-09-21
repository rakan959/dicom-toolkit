import { test, expect } from "@playwright/test";
import JSZip from "jszip";

test.describe("E2E: ZIP drag & drop load", () => {
  test("loads from a dropped ZIP and shows series items", async ({ page }) => {
    // @req: N-006
    // @req: F-015
    const base = process.env.E2E_BASE_URL || "http://localhost:4173";
    await page.goto(base);

    // Create a small ZIP in-memory with two DICOM-like files
    const zip = new JSZip();
    // Include 'DICM' magic at 128 for deep check to pass
    function mkDicomBytes(): Uint8Array {
      const buf = new Uint8Array(200);
      buf[128] = 0x44; // D
      buf[129] = 0x49; // I
      buf[130] = 0x43; // C
      buf[131] = 0x4d; // M
      return buf;
    }
    zip.file("study-A_series-S9_inst-I1_mod-CT.dcm", mkDicomBytes());
    zip.file("study-A_series-S9_inst-I2_mod-CT.dcm", mkDicomBytes());
    const zipBlob = await zip.generateAsync({ type: "blob" });

    // Compose a DataTransfer with a File containing the zip
    const dt = await page.evaluateHandle(
      async (b64: string) => {
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const ab = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
        const file = new File([ab], "demo.dicom.zip", { type: "application/zip" });
        const dt = new DataTransfer();
        // DataTransferItem constructor is not available widely; use DataTransfer API
        dt.items.add(file);
        return dt;
      },
      await zipBlob.arrayBuffer().then((ab) => Buffer.from(new Uint8Array(ab)).toString("base64")),
    );

    const dropZone = page.locator('[data-test="drop-zone"], label.drop-bar');
    await expect(dropZone.first()).toBeVisible();

    // Dispatch dragover and drop with the DataTransfer using real DragEvent in page context
    const zone = page.locator('[data-test="drop-zone"], label.drop-bar');
    const zoneEl = await zone.elementHandle();
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

    // Expect the Series Browser to reflect the newly loaded S9 series with two instances
    const seriesItems = page.locator('[data-test="series-item"]');
    await expect(seriesItems).toHaveCount(1);
    const uids = await seriesItems.evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-series-uid")),
    );
    expect(uids).toEqual(["S9"]);
  });
});
