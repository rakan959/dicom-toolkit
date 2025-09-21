import { test, expect } from "@playwright/test";

test.describe("E2E: Load & Browse", () => {
  test("loads the demo site and lists deterministic series order", async ({ page }) => {
    // Given the preview server is running for the static demo site
    // @req: N-006
    const base = process.env.E2E_BASE_URL || "http://localhost:4173";

    // When navigating to the app root
    await page.goto(base);

    // Then the Series Browser is visible with the demo manifest rendered
    // @req: F-005
    const browser = page.locator('[data-test="series-browser"]');
    await expect(browser).toBeVisible();

    const seriesItems = page.locator('[data-test="series-item"]');
    await expect(seriesItems).toHaveCount(2);

    // And the series are ordered deterministically (S1 before S2)
    // Use data-series-uid to avoid button label text in the LI contents.
    // @req: F-015
    const uids = await seriesItems.evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-series-uid")),
    );
    expect(uids).toEqual(["S1", "S2"]);
  });

  test("metamorphic: reload keeps the same series order", async ({ page }) => {
    // Given the app has been loaded
    // @req: N-006
    const base = process.env.E2E_BASE_URL || "http://localhost:4173";
    await page.goto(base);

    const getSeriesUIDs = async () =>
      page
        .locator('[data-test="series-item"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute("data-series-uid")));

    const before = await getSeriesUIDs();
    expect(before).toEqual(["S1", "S2"]);

    // When reloading (metamorphic transform: identity on dataset, re-render UI)
    await page.reload();

    // Then the order is unchanged
    // @req: F-005
    const after = await getSeriesUIDs();
    expect(after).toEqual(before);
  });
});
