import fs from "node:fs";
import path from "node:path";
import glob from "fast-glob";

/**
 * Fails if any REQUIREMENTS.yml id is not referenced by at least one test
 * via a line containing "@req: <ID>".
 */
function main() {
  const root = process.cwd();
  const reqPath = path.join(root, "REQUIREMENTS.yml");
  const reqText = fs.readFileSync(reqPath, "utf8");
  // Extract IDs with a simple, resilient regex: lines like "- id: F-001"
  const idRegex = /^\s*-\s*id:\s*([A-Z]-\d{3})\s*$/gm;
  const ids = [];
  let m;
  while ((m = idRegex.exec(reqText)) !== null) ids.push(m[1]);
  if (ids.length === 0) {
    console.error("No requirement IDs found in REQUIREMENTS.yml");
    process.exit(1);
  }

  const testFiles = glob.sync(
    [
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "tests/**/*.spec.ts",
      "tests/**/*.spec.tsx",
      "e2e/**/*.spec.ts",
      "e2e/**/*.test.ts",
    ],
    {
      cwd: root,
      absolute: true,
    },
  );

  const found = new Map();
  ids.forEach((id) => found.set(id, []));

  for (const file of testFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const id of ids) {
      const regex = new RegExp(`@req:\\s*${id}\\b`);
      if (regex.test(text)) {
        found.get(id).push(path.relative(root, file));
      }
    }
  }

  const missing = ids.filter((id) => (found.get(id) || []).length === 0);
  if (missing.length) {
    console.error("Missing @req references for IDs:", missing.join(", "));
    process.exit(1);
  } else {
    console.log("All requirements referenced in tests. ✅");
  }
}

main();
