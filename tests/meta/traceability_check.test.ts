import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import fg from "fast-glob";

describe("Traceability invariant (@req: N-004)", () => {
  it("every requirement ID is referenced by at least one test file", () => {
    // @req: N-004
    const root = path.resolve(__dirname, "..", "..");
    const reqDoc: any = yaml.load(fs.readFileSync(path.join(root, "REQUIREMENTS.yml"), "utf8"));
    const reqs: string[] = (reqDoc.requirements || []).map((r: any) => r.id);
    const files = fg.sync(
      ["tests/**/*.test.ts", "tests/**/*.spec.ts", "tests/**/*.test.tsx", "tests/**/*.spec.tsx"],
      {
        cwd: root,
        absolute: true,
      },
    );
    const byId = new Map<string, string[]>();
    reqs.forEach((id) => byId.set(id, []));
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      for (const id of reqs) {
        const re = new RegExp(`@req:\\s*${id}\\b`);
        if (re.test(text)) byId.get(id)!.push(path.relative(root, file));
      }
    }
    const missing = reqs.filter((id) => (byId.get(id) || []).length === 0);
    if (missing.length) {
      const details = Array.from(byId.entries())
        .filter(([_, files]) => files.length === 0)
        .map(([id]) => id)
        .join(", ");
      throw new Error(`Missing @req references for: ${details}`);
    }
    expect(true).toBe(true);
  });
});
