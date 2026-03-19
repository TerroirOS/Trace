#!/usr/bin/env node

import { getInstallState } from "./install-state.mjs";

const { ok, problems, blockers } = getInstallState();

console.log("Trace dependency state");
console.log("======================");

if (ok) {
  console.log("[ok] Workspace dependencies are installed and ready.");
  process.exit(0);
}

console.log("[fail] Workspace dependencies are incomplete.");

if (blockers.length > 0) {
  console.log("");
  console.log("Known blockers");
  console.log("--------------");
  for (const blocker of blockers) {
    console.log(`- ${blocker}`);
  }
}

if (problems.length > 0) {
  console.log("");
  console.log("npm reported");
  console.log("------------");
  for (const problem of problems.slice(0, 20)) {
    console.log(`- ${problem}`);
  }
  if (problems.length > 20) {
    console.log(`- ...and ${problems.length - 20} more`);
  }
}

console.log("");
console.log("Next steps");
console.log("----------");
console.log("1. Run `npm.cmd install` after the missing tarballs are available in the local npm cache.");
console.log("2. Re-run `npm.cmd run deps:check` to confirm the workspace is complete.");
console.log("3. Run `npm.cmd run build` once the dependency check passes.");

process.exit(1);
