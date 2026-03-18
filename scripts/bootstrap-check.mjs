#!/usr/bin/env node

import { accessSync, constants, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();
const requiredFiles = [
  "package.json",
  "package-lock.json",
  ".env.example",
  "docker-compose.yml",
  "apps/api/package.json",
  "apps/web/package.json",
  "packages/contracts/package.json",
  "packages/schemas/package.json",
  "packages/sdk/package.json",
];

const checks = [];

function record(ok, label, detail) {
  checks.push({ ok, label, detail });
}

function readJson(path) {
  return JSON.parse(readFileSync(join(rootDir, path), "utf8"));
}

for (const file of requiredFiles) {
  record(existsSync(join(rootDir, file)), `Required file: ${file}`);
}

const rootPackage = readJson("package.json");
record(Array.isArray(rootPackage.workspaces), "Root workspaces are declared");

const lockfile = readJson("package-lock.json");
record(lockfile.lockfileVersion === 3, "Lockfile version is npm workspace compatible", `Found v${lockfile.lockfileVersion}`);

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
record(nodeMajor >= 20, "Node.js major version is supported", `Detected ${process.version}`);

const npmExecPath = process.env.npm_execpath;
record(Boolean(npmExecPath), "npm runtime is available", npmExecPath ? `Using ${npmExecPath}` : "Run this script with npm.cmd on Windows");

const envContent = readFileSync(join(rootDir, ".env.example"), "utf8");
for (const key of [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "TRACE_API_URL",
  "CHAIN_RPC_URL",
]) {
  record(envContent.includes(`${key}=`), `.env.example includes ${key}`);
}

try {
  accessSync(join(rootDir, "docker-compose.yml"), constants.R_OK);
  record(true, "docker-compose.yml is readable");
} catch (error) {
  record(false, "docker-compose.yml is readable", error instanceof Error ? error.message : String(error));
}

let failures = 0;
console.log("Trace bootstrap baseline");
console.log("========================");
for (const check of checks) {
  const marker = check.ok ? "[ok]" : "[fail]";
  console.log(`${marker} ${check.label}${check.detail ? ` - ${check.detail}` : ""}`);
  if (!check.ok) {
    failures += 1;
  }
}

console.log("");
console.log("Next steps");
console.log("----------");
console.log("1. Copy .env.example to .env and fill secrets before running app services.");
console.log("2. Start local dependencies with `docker compose up -d`.");
console.log("3. Install dependencies with `npm.cmd install`.");
console.log("4. Use `npm.cmd run build` to validate the workspace once install succeeds.");

if (failures > 0) {
  process.exitCode = 1;
}
