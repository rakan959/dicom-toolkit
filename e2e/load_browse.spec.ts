import { test, expect } from "@playwright/test";

test.describe("E2E: Load & Browse", () => {
  test("loads the demo site and lists deterministic series order", async ({ page }) => {
    // Given the preview server is running for the static demo site
    // @req: N-006
    const base = process.env.E2E_BASE_URL || "http://localhost:4173";

    // When navigating to the app root
    await page.goto(base);

    // Then the viewer auto-assigns the first two series deterministically (S1 before S2)
    // Validate via the series tags in the grid
    // @req: F-015
    const firstTag = page.locator('[data-test="series-tag"]').first();
    await expect(firstTag).toHaveText("A:S1");
  });

  test("metamorphic: reload keeps the same series order", async ({ page }) => {
    // Given the app has been loaded
    // @req: N-006
    const base = process.env.E2E_BASE_URL || "http://localhost:4173";
    await page.goto(base);

    const getSeriesUIDs = async () => page.locator('[data-test="series-tag"]').allTextContents();

    const before = await getSeriesUIDs();
    expect(before[0]).toEqual("A:S1");

    // When reloading (metamorphic transform: identity on dataset, re-render UI)
    await page.reload();

    // Then the order is unchanged
    // @req: F-015
    const after = await getSeriesUIDs();
    expect(after[0]).toEqual(before[0]);
  });
});
