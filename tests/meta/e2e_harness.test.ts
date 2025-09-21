import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Meta: E2E harness presence
 * Ensures the repository contains a configured Playwright setup with a preview server.
 */
describe("E2E harness and smoke config (@req: N-006)", () => {
  it("has Playwright config with baseURL and webServer", () => {
    // @req: N-006
    const root = path.resolve(__dirname, "..", "..");
    const cfgPath = path.join(root, "playwright.config.ts");
    expect(fs.existsSync(cfgPath)).toBe(true);
    const cfg = fs.readFileSync(cfgPath, "utf8");
    expect(cfg).toMatch(/baseURL:/);
    expect(cfg).toMatch(/webServer:/);
    // Should use vite preview on a stable port
    expect(cfg).toMatch(/vite preview/);
    expect(cfg).toMatch(/port\s*:\s*4173/);
  });
});
