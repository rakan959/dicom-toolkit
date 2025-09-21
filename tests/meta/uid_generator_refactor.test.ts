import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

// Guardrail: ensure tests don't hand-roll UID generation using random sources.
// Tests should use tests/setup/uid.ts (arbUID) when they need generated UIDs.
describe("Meta: no ad-hoc UID generation in tests", () => {
  it("finds no test lines that combine 'UID' with random sources", () => {
    const root = path.resolve(__dirname, "..", "..");
    const files = fg.sync(["tests/**/*.test.ts", "tests/**/*.spec.ts"], {
      cwd: root,
      absolute: true,
    });

    const offenders: { file: string; line: number; text: string }[] = [];
    const randomPatterns = [
      /Math\.random\s*\(/, // JS random
      /Date\.now\s*\(/, // time-based
      /crypto\.randomUUID\s*\(/, // UUID v4
    ];

    for (const file of files) {
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((text, idx) => {
        if (!/UID/i.test(text)) return; // focus only lines mentioning UID
        if (randomPatterns.some((re) => re.test(text))) {
          offenders.push({ file: path.relative(root, file), line: idx + 1, text: text.trim() });
        }
      });
    }

    if (offenders.length) {
      const details = offenders.map((o) => `${o.file}:${o.line} -> ${o.text}`).join("\n");
      throw new Error(
        `Found ad-hoc UID generation in tests. Use tests/setup/uid.ts (arbUID) instead.\n${details}`,
      );
    }
    expect(true).toBe(true);
  });
});
