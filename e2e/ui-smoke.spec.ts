import { test, expect } from "@playwright/test";
// @req: F-100
test.describe("UI smoke", () => {
  test("app shell loads", async ({ page }) => {
    const base = process.env.E2E_BASE_URL || "http://localhost:4173";
    await page.goto(base);
    await expect(page.locator("body")).toBeVisible();
  });
});
