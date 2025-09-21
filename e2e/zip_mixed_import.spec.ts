import { test, expect } from "@playwright/test";
import { makeMixedZipBase64 } from "./fixtures/mixed_zip";

test.describe("ZIP import - mixed DICOM/non-DICOM", () => {
  test("drops a mixed zip and loads DICOMs even without DICM preamble or .dcm extension", async ({
    page,
  }) => {
    const base = process.env.E2E_BASE_URL || "http://localhost:4173";
    await page.goto(base);

    // Build a small mixed zip: 2 series x 3 instances + 4 noise files
    const b64 = await makeMixedZipBase64({
      dicomSeries: 2,
      instPerSeries: 4,
      nonDicomCount: 4,
      includeNoPreamble: true,
    });
    const zipBytes = Buffer.from(b64, "base64");
    const fileName = "mixed_test.zip";

    // Inject the file and perform a drop on the drop zone button
    const dataTransfer = await page.evaluateHandle(
      async ({ bytes, name }) => {
        const dt = new DataTransfer();
        const blob = new Blob([new Uint8Array(bytes)], { type: "application/zip" });
        const file = new File([blob], name, { type: "application/zip" });
        dt.items.add(file);
        return dt;
      },
      { bytes: Array.from(zipBytes.values()), name: fileName },
    );

    const dropZone = page.getByRole("button", { name: /import dicom files or zip/i });
    await expect(dropZone).toBeVisible();

    await dropZone.dispatchEvent("drop", { dataTransfer });

    // Wait for processing text to appear then resolve to "Processed" message
    await expect(dropZone).toContainText(/Scanning ZIP:|Processing…/);
    await expect(dropZone).toContainText(/Processed/);

    // Expect the series browser to show some thumbnails or series items.
    // Heuristic: look for elements with data-test attributes or alt text from thumbnails.
    const seriesItems = page.locator('[data-test="series-item"], [data-test^="thumb-"]');
    await expect(seriesItems.first()).toBeVisible({ timeout: 10000 });
    // Assert the extensionless/no-preamble series with UID 'NP' is present
    const npItem = page.locator('[data-test="series-item"][data-series-uid="NP"]');
    await expect(npItem).toBeVisible({ timeout: 10000 });
  });
});
