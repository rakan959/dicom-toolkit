import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";

describe("Offline-only invariant (@req: N-005)", () => {
  it("source contains no direct network API usage", () => {
    // @req: N-005
    const root = path.resolve(__dirname, "..", "..");
    const files = fg.sync(["src/**/*.ts"], { cwd: root, absolute: true });
    const offenders: { file: string; line: number; text: string }[] = [];

    const patterns: RegExp[] = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bnew\s+WebSocket\s*\(/,
      /\bnavigator\.sendBeacon\s*\(/,
      /\baxios\s*\./,
      /https?:\/\//,
    ];

    for (const file of files) {
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((text, idx) => {
        if (patterns.some((re) => re.test(text))) {
          offenders.push({ file: path.relative(root, file), line: idx + 1, text: text.trim() });
        }
      });
    }

    if (offenders.length) {
      const details = offenders.map((o) => `${o.file}:${o.line} -> ${o.text}`).join("\n");
      throw new Error(
        `Found network API usage in source (offline-only constraint). If intentional, add an allowlist to this test.\n${details}`,
      );
    }
    expect(true).toBe(true);
  });
});
