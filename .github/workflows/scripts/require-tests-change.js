const { execSync } = require("node:child_process");

function main() {
  const base = process.env.GITHUB_BASE_REF || "origin/main";
  const head = process.env.GITHUB_SHA;
  // Files changed in src vs tests
  const srcChanged = execSync(`git --no-pager diff --name-only ${base}...${head} -- src | cat`).toString().trim();
  const testChanged = execSync(`git --no-pager diff --name-only ${base}...${head} -- tests | cat`).toString().trim();

  if (srcChanged && !testChanged) {
    console.error("Source files changed but no tests were modified. Failing per N-003.");
    process.exit(1);
  } else {
    console.log("Change set includes tests or no src changes. ✅");
  }
}

main();
