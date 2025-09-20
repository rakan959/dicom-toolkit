import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import glob from "fast-glob";

/**
 * Fails if any REQUIREMENTS.yml id is not referenced by at least one test
 * via a line containing "@req: <ID>".
 */
function main() {
  const root = process.cwd();
  const reqPath = path.join(root, "REQUIREMENTS.yml");
  const reqDoc = yaml.load(fs.readFileSync(reqPath, "utf8"));
  const reqs: string[] = (reqDoc.requirements || []).map((r: any) => r.id);

  const testFiles = glob.sync(["tests/**/*.test.ts", "tests/**/*.spec.ts"], {
    cwd: root,
    absolute: true,
  });

  const found = new Map<string, string[]>();
  reqs.forEach((id) => found.set(id, []));

  for (const file of testFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const id of reqs) {
      const regex = new RegExp(`@req:\\s*${id}\\b`);
      if (regex.test(text)) {
        found.get(id)!.push(path.relative(root, file));
      }
    }
  }

  const missing = reqs.filter((id) => (found.get(id) || []).length === 0);
  if (missing.length) {
    console.error("Missing @req references for IDs:", missing.join(", "));
    process.exit(1);
  } else {
    console.log("All requirements referenced in tests. ✅");
  }
}

main();
