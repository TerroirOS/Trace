#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { getInstallState } from "./install-state.mjs";

const script = process.argv[2];

if (!script) {
  console.error("Usage: node scripts/run-workspaces.mjs <script>");
  process.exit(1);
}

const workspaces = [
  "@terroiros/schemas",
  "@terroiros/sdk",
  "@terroiros/contracts",
  "@terroiros/api",
  "@terroiros/web",
];

const installState = getInstallState();
if (!installState.ok) {
  console.error(`Cannot run workspace script "${script}" because dependencies are incomplete.`);
  console.error("Run `npm.cmd run deps:check` for the current blockers.");
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

for (const workspace of workspaces) {
  const result = spawnSync(
    npmCommand,
    ["run", script, "-w", workspace, "--if-present"],
    {
      stdio: "inherit",
      shell: false,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
