import { test, expect } from "@playwright/test";

test.describe("Assign interactions (e2e)", () => {
  test("Alt+1 focuses first viewport and drop overlay toggles on dragover", async ({ page }) => {
    const base = process.env.E2E_BASE_URL || "http://localhost:4173";
    await page.goto(base);

    const vp = page.locator('[data-test="viewport"]').first();
    await expect(vp).toBeVisible();

    // Alt+1 focuses first viewport
    await page.keyboard.down("Alt");
    await page.keyboard.press("1");
    await page.keyboard.up("Alt");
    await expect(vp).toBeFocused();

    // Simulate overlay affordance: run in page context to construct DataTransfer
    await page.evaluate((sel) => {
      const el = document.querySelector(sel)!;
      const dt = new DataTransfer();
      // We only need the MIME type present for overlay affordance; setData ensures type is included
      dt.setData("application/x-series-ref", "{}");
      const ev = new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: dt });
      el.dispatchEvent(ev);
    }, '[data-test="viewport"]');
    await expect(vp).toHaveAttribute("data-drop-series", "1");
  });
});
