import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

/**
 * Guard REQUIREMENTS.yml: IDs must be unique and follow category-code pattern.
 */
describe("Requirements file format (@req: N-004)", () => {
  it("IDs are unique and match ^[FNS]-\\d{3}$", () => {
    // @req: N-004
    const root = path.resolve(__dirname, "..", "..");
    const reqDoc: any = yaml.load(fs.readFileSync(path.join(root, "REQUIREMENTS.yml"), "utf8"));
    const reqs: string[] = (reqDoc.requirements || []).map((r: any) => r.id);

    // Pattern check
    const pattern = /^(F|N|S)-\d{3}$/;
    const badPattern = reqs.filter((id) => !pattern.test(id));
    if (badPattern.length) {
      throw new Error(`Requirement IDs with invalid format: ${badPattern.join(", ")}`);
    }

    // Uniqueness check
    const set = new Set(reqs);
    if (set.size !== reqs.length) {
      const seen = new Set<string>();
      const dups = reqs.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
      throw new Error(`Duplicate requirement IDs found: ${Array.from(new Set(dups)).join(", ")}`);
    }

    expect(true).toBe(true);
  });
});
