#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();

function readJson(path) {
  return JSON.parse(readFileSync(join(rootDir, path), "utf8"));
}

function getPackageInstallPath(packageName) {
  return join(rootDir, "node_modules", ...packageName.split("/"));
}

function collectMissingDependencies(manifestPath, label) {
  const manifest = readJson(manifestPath);
  const declared = {
    ...(manifest.dependencies ?? {}),
    ...(manifest.devDependencies ?? {}),
  };
  const missing = [];

  for (const [packageName, version] of Object.entries(declared)) {
    if (!existsSync(getPackageInstallPath(packageName))) {
      missing.push(`missing: ${packageName}@${version}, required by ${label}`);
    }
  }

  return missing;
}

function findKnownOfflineBlockers() {
  const blockers = [];
  const lockfile = readJson("package-lock.json");
  const zodPackage = lockfile.packages?.["node_modules/zod"];
  const isOffline = process.env.npm_config_offline === "true";

  if (isOffline) {
    blockers.push("npm offline mode is enabled in this environment.");
  }

  if (zodPackage?.version === "3.25.76") {
    blockers.push(
      "package-lock.json currently resolves zod@3.25.76, which has already blocked offline install in this repo.",
    );
  }

  return blockers;
}

export function getInstallState() {
  const problems = [
    ...collectMissingDependencies("package.json", "terroiros@0.1.0"),
    ...collectMissingDependencies("apps/api/package.json", "@terroiros/api@0.1.0"),
    ...collectMissingDependencies("apps/web/package.json", "@terroiros/web@0.1.0"),
    ...collectMissingDependencies("packages/contracts/package.json", "@terroiros/contracts@0.1.0"),
    ...collectMissingDependencies("packages/schemas/package.json", "@terroiros/schemas@0.1.0"),
    ...collectMissingDependencies("packages/sdk/package.json", "@terroiros/sdk@0.1.0"),
  ];
  const blockers = findKnownOfflineBlockers();

  return {
    ok: problems.length === 0 && blockers.length === 0,
    problems,
    blockers,
  };
}
