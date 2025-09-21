import { test, expect } from "@playwright/test";

// Validate Advanced Anonymizer UI preview behavior end-to-end via window hook
// Covers: F-007 (redaction without mutation, deterministic render)
test("Advanced Anonymizer UI renders and redacts", async ({ page }) => {
  const base = process.env.E2E_BASE_URL || "http://localhost:4173";
  await page.goto(base);

  // Create a container in the DOM and construct the UI from the exposed hook
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "anon-host";
    document.body.appendChild(host);
  });
  await page.waitForSelector("#anon-host", { state: "attached" });

  const result = await page.evaluate(() => {
    const api = (window as any).__DTK.createAdvancedAnonymizerUI(
      document.getElementById("anon-host")!,
    );
    const frame = new Uint8Array([1, 2, 3, 4]);
    api.setFrame(frame, 2, 2);
    api.setRectangles([{ x: 1, y: 1, w: 1, h: 1 }]);
    const out1: number[] = Array.from(api.getRedactedBuffer());
    api.setRedactValue(99);
    const out2: number[] = Array.from(api.getRedactedBuffer());
    return { out1, out2, orig: Array.from(frame) };
  });

  expect(result.orig).toEqual([1, 2, 3, 4]);
  expect(result.out1).toEqual([1, 2, 3, 0]);
  expect(result.out2).toEqual([1, 2, 3, 99]);
});
