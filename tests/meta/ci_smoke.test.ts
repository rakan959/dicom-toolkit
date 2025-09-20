import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Acceptance: A00-CI-smoke
 * Given the repository
 * When CI runs
 * Then lint/typecheck/coverage, mutation quick-run, and requirements traceability are enforced.
 */
describe("CI configuration smoke", () => {
  const root = path.resolve(__dirname, "..", "..");

  it("has required scripts and config present (@req: N-001, @req: N-002, @req: N-003, @req: N-004, @req: F-002)", () => {
    // @req: N-001
    // @req: N-002
    // @req: N-003
    // @req: N-004
    // @req: F-002
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const scripts = pkg.scripts || {};
    // linting, formatting, types, tests/coverage, mutation quick, requirements check
    expect(typeof scripts["lint"]).toBe("string");
    expect(typeof scripts["typecheck"]).toBe("string");
    expect(typeof scripts["coverage"]).toBe("string");
    expect(typeof scripts["mutation:quick"]).toBe("string");
    expect(typeof scripts["check:reqs"]).toBe("string");
    expect(typeof scripts["build"]).toBe("string"); // static build (F-002)
    expect(typeof scripts["format:check"]).toBe("string"); // formatting enforced in CI (N-001)

    // vitest coverage thresholds >= 0.8
    const vitestConfig = fs.readFileSync(path.join(root, "vitest.config.ts"), "utf8");
    const threshMatch = vitestConfig.match(/thresholds\s*:\s*\{[^}]*\}/m);
    expect(threshMatch, "vitest thresholds missing").toBeTruthy();
    const text = threshMatch![0];
    // simple regex checks
    for (const k of ["lines", "functions", "branches", "statements"]) {
      const m = text.match(new RegExp(`${k}[^0-9]*([01]?(?:\\.[0-9]+)?)`, "m"));
      expect(m, `${k} threshold missing`).toBeTruthy();
      const v = parseFloat(m![1]);
      expect(v).toBeGreaterThanOrEqual(0.8);
    }

    // stryker break threshold <= 65
    const stryker = JSON.parse(fs.readFileSync(path.join(root, "stryker.conf.json"), "utf8"));
    expect(stryker.thresholds).toBeTruthy();
    expect(typeof stryker.thresholds.break).toBe("number");
    expect(stryker.thresholds.break).toBeLessThanOrEqual(65);

    // requirements checker exists
    expect(fs.existsSync(path.join(root, "tools", "check_requirements.mjs"))).toBe(true);

    // CI workflows exist and include the right steps
    const ciPath = path.join(root, ".github", "workflows", "ci.yml");
    const nightlyPath = path.join(root, ".github", "workflows", "nightly-mutation.yml");
    expect(fs.existsSync(ciPath)).toBe(true);
    expect(fs.existsSync(nightlyPath)).toBe(true);
    const ciYml = fs.readFileSync(ciPath, "utf8");
    // Ensure core steps are present
    expect(ciYml).toMatch(/npm run format:check/);
    expect(ciYml).toMatch(/npm run lint/);
    expect(ciYml).toMatch(/npm run typecheck/);
    expect(ciYml).toMatch(/npm run coverage/);
    expect(ciYml).toMatch(/npm run check:reqs/);
    expect(ciYml).toMatch(/node\s+tools\/check_tests_changed\.mjs/);
    expect(ciYml).toMatch(/vite build|npm run build/);

    // Nightly mutation quick-run scheduled
    const nightlyYml = fs.readFileSync(nightlyPath, "utf8");
    expect(nightlyYml).toMatch(/on:\s*[\s\S]*schedule:/);
    expect(nightlyYml).toMatch(/npm run mutation:quick/);

    // Guard script exists
    expect(fs.existsSync(path.join(root, "tools", "check_tests_changed.mjs"))).toBe(true);
  });
});
