import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import fg from "fast-glob";

/**
 * Ensures no test references an unknown requirement ID.
 * Complements tests/meta/traceability_check.test.ts.
 */
describe("Traceability inverse check (@req: N-004)", () => {
  it("every @req: tag refers to a declared requirement ID", () => {
    // @req: N-004
    const root = path.resolve(__dirname, "..", "..");
    const reqDoc: any = yaml.load(fs.readFileSync(path.join(root, "REQUIREMENTS.yml"), "utf8"));
    const valid: Set<string> = new Set((reqDoc.requirements || []).map((r: any) => r.id));
    const files = fg.sync(["tests/**/*.test.ts", "tests/**/*.spec.ts"], {
      cwd: root,
      absolute: true,
    });

    const unknowns: { id: string; file: string; line: number; text: string }[] = [];

    for (const file of files) {
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((text, idx) => {
        const m = text.match(/@req:\s*([A-Z]-\d{3})\b/);
        if (m) {
          const id = m[1];
          if (!valid.has(id)) {
            unknowns.push({
              id,
              file: path.relative(root, file),
              line: idx + 1,
              text: text.trim(),
            });
          }
        }
      });
    }

    if (unknowns.length) {
      const details = unknowns.map((u) => `${u.file}:${u.line} -> ${u.id} | ${u.text}`).join("\n");
      throw new Error(
        `Unknown requirement IDs referenced in tests. Add to REQUIREMENTS.yml or fix typos.\n${details}`,
      );
    }

    expect(true).toBe(true);
  });
});
