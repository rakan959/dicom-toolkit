#!/usr/bin/env node
// Fails if source files changed in a PR without corresponding test changes (N-003)
import { execSync } from "node:child_process";

function getChangedFiles(refRange) {
  try {
    const out = execSync(`git --no-pager diff --name-only ${refRange}`, { encoding: "utf8" });
    return out.split("\n").filter(Boolean);
  } catch (err) {
    return null; // unable to compute diff with given range
  }
}

function main() {
  // Determine diff range: prefer PR comparison if available, else fallback to HEAD~1
  let range = null;
  try {
    const base = process.env.GITHUB_BASE_REF; // for PRs
    const head = process.env.GITHUB_HEAD_REF;
    if (base && head) {
      // use the merge-base against origin/base
      const mergeBase = execSync(`git merge-base origin/${base} HEAD`, { encoding: "utf8" }).trim();
      range = `${mergeBase}..HEAD`;
    } else {
      // Fallback to last commit if available
      const countRaw = execSync("git rev-list --count HEAD", { encoding: "utf8" }).trim();
      const count = Number.parseInt(countRaw, 10);
      if (Number.isFinite(count) && count >= 2) {
        range = "HEAD~1..HEAD";
      }
    }
  } catch {}

  const changed = range ? getChangedFiles(range) : null;

  if (!changed) {
    console.warn(
      "[check_tests_changed] Unable to compute diff range (shallow clone or no previous commit). Skipping change guard.",
    );
    process.exit(0);
  }
  const srcChanged = changed.some(
    (f) => f.startsWith("src/") || (f.endsWith(".ts") && !f.startsWith("tests/")),
  );
  const testsChanged = changed.some((f) => f.startsWith("tests/"));

  if (srcChanged && !testsChanged) {
    console.error("Source files changed without corresponding test changes. Failing as per N-003.");
    process.exit(1);
  } else {
    console.log("Change guard passed.");
  }
}

main();
