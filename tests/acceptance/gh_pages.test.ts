import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Acceptance: A11-gh-pages
 * Given the repository
 * When the GH Pages workflow runs
 * Then the site is built as a static site and deployed to GitHub Pages with correct base.
 */
describe("GH Pages deploy", () => {
  const root = path.resolve(__dirname, "..", "..");

  it("has gh-pages workflow and vite base configured (@req: F-002)", () => {
    // @req: F-002
    const wf = path.join(root, ".github", "workflows", "gh-pages.yml");
    expect(fs.existsSync(wf)).toBe(true);
    const yml = fs.readFileSync(wf, "utf8");
    // Ensure it uploads artifact and deploys pages
    expect(yml).toMatch(/upload-pages-artifact/i);
    expect(yml).toMatch(/deploy-pages/i);
  // Ensure GH_PAGES_BASE is passed to vite build step
  expect(yml).toMatch(/GH_PAGES_BASE:\s*['"]?\/.+\/['"]?/);

    // Vite config must honor GH_PAGES_BASE
    const viteCfg = fs.readFileSync(path.join(root, "vite.config.ts"), "utf8");
    expect(viteCfg).toMatch(/const base = process\.env\.GH_PAGES_BASE \|\| "/);
    expect(viteCfg.includes("base,")).toBe(true);
  });
});
