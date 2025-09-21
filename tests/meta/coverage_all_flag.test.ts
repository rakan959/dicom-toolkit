import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Acceptance: A00-CI-smoke
 * Guardrail for @req: N-002 (coverage floor enforcement) — ensure coverage.all = true in vitest config
 */
describe("Vitest coverage 'all' flag is enabled (@req: N-002)", () => {
  it("vitest.config.ts sets coverage.all = true", () => {
    // tests/meta -> tests -> repo root
    const root = path.resolve(__dirname, "..", "..");
    const cfgPath = path.join(root, "vitest.config.ts");
    const text = fs.readFileSync(cfgPath, "utf8");
    // very light-weight parse: look for coverage: { ... all: true }
    const hasAllTrue = /coverage\s*:\s*\{[\s\S]*?all\s*:\s*true[\s\S]*?\}/m.test(text);
    expect(hasAllTrue).toBe(true);
  });
});
