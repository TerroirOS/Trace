import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const defaultSeedFile = path.join(
  repoRoot,
  "docs",
  "sample-data",
  "georgian-wine-demo.json"
);
const host = process.env.TRACE_VERIFY_HOST ?? process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.TRACE_VERIFY_PORT ?? process.env.PORT ?? 4100);
const baseUrl = `http://${host}:${port}`;
const apiStartTimeoutMs = 30_000;
const requestTimeoutMs = 10_000;
const seedFile = process.env.TRACE_SEED_FILE
  ? path.resolve(repoRoot, process.env.TRACE_SEED_FILE)
  : defaultSeedFile;
const flags = new Set(process.argv.slice(2));

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function hasFlag(flag) {
  return flags.has(flag);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required for restart verification. Point it at the local/dev Postgres instance first."
    );
  }

  const seed = JSON.parse(await readFile(seedFile, "utf8"));
  const sharedEnv = {
    ...process.env,
    HOST: host,
    PORT: String(port)
  };

  if (!hasFlag("--skip-migrate")) {
    await runNpm(["run", "db:migrate"], sharedEnv);
  }
  if (!hasFlag("--skip-seed")) {
    await runNpm(["run", "db:seed"], sharedEnv);
  }
  if (!hasFlag("--skip-build")) {
    await runNpm(["run", "build", "-w", "@terroiros/api"], sharedEnv);
  }

  const firstBoot = await withApiServer(sharedEnv, async () => {
    const snapshot = await collectSnapshot(seed);
    assertSnapshot(seed, snapshot);
    return snapshot;
  });

  const secondBoot = await withApiServer(sharedEnv, async () => {
    const snapshot = await collectSnapshot(seed);
    assertSnapshot(seed, snapshot);
    return snapshot;
  });

  if (
    JSON.stringify(normalizeSnapshot(firstBoot)) !==
    JSON.stringify(normalizeSnapshot(secondBoot))
  ) {
    throw new Error(
      "Restart verification failed: endpoint snapshots changed after restarting the API."
    );
  }

  console.log(`Verified persisted endpoint state across restart at ${baseUrl}.`);
  console.log(
    `Counts: producers=${firstBoot.producers.length}, issuers=${firstBoot.issuers.length}, batches=${firstBoot.batches.length}, events=${firstBoot.events.length}, chainTransactions=${firstBoot.chainTransactions.length}`
  );
}

async function runNpm(args, env) {
  const npmCommand = getNpmCommand();
  await new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd: repoRoot,
      env,
      stdio: "inherit",
      windowsHide: true
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(
        new Error(`Command failed: ${npmCommand} ${args.join(" ")} (exit ${code ?? "null"})`)
      );
    });
  });
}

async function withApiServer(env, callback) {
  const npmCommand = getNpmCommand();
  const child = spawn(npmCommand, ["run", "start", "-w", "@terroiros/api"], {
    cwd: repoRoot,
    env,
    stdio: "inherit",
    windowsHide: true
  });

  try {
    await waitForApi(child);
    return await callback();
  } finally {
    await stopProcessTree(child);
  }
}

async function waitForApi(child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < apiStartTimeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`API process exited before becoming ready (exit ${child.exitCode}).`);
    }
    try {
      const response = await fetchWithTimeout(`${baseUrl}/producers`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for the API to become ready at ${baseUrl}.`);
}

async function stopProcessTree(child) {
  if (child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true
    });
  } else {
    child.kill("SIGTERM");
  }

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (process.platform !== "win32" && child.exitCode === null) {
        child.kill("SIGKILL");
      }
      resolve(undefined);
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve(undefined);
    });
  });
}

async function collectSnapshot(seed) {
  const producerId = seed.producers[0]?.producerId;
  const batchId = seed.batches[0]?.batchId;
  const issuerIds = seed.issuers.map((issuer) => issuer.issuerId);
  const eventIds = seed.events.map((event) => event.eventId);

  if (!producerId || !batchId || issuerIds.length === 0 || eventIds.length === 0) {
    throw new Error("Seed file does not include the expected producer, batch, issuer, and event fixtures.");
  }

  const producers = await fetchJson("/producers");
  const producerDetail = await fetchJson(`/producers/${producerId}`);
  const issuers = await fetchJson("/issuers");
  const issuerDetails = await Promise.all(
    issuerIds.map((issuerId) => fetchJson(`/issuers/${issuerId}`))
  );
  const batches = await fetchJson("/batches");
  const batchDetail = await fetchJson(`/batches/${batchId}`);
  const events = await fetchJson(`/events/batch/${batchId}`);
  const eventDetails = await Promise.all(
    eventIds.map((eventId) => fetchJson(`/events/${eventId}`))
  );
  const chainTransactions = await fetchJson("/chain/transactions");
  const verification = await fetchJson(`/verification/${batchId}`);

  return {
    producers,
    producerDetail,
    issuers,
    issuerDetails,
    batches,
    batchDetail,
    events,
    eventDetails,
    chainTransactions,
    verification
  };
}

function assertSnapshot(seed, snapshot) {
  assertArrayCount("producers", snapshot.producers, seed.producers.length);
  assertArrayCount("issuers", snapshot.issuers, seed.issuers.length);
  assertArrayCount("batches", snapshot.batches, seed.batches.length);
  assertArrayCount("events", snapshot.events, seed.events.length);
  assertArrayCount(
    "chain transactions",
    snapshot.chainTransactions,
    seed.chainTransactions.length
  );

  assertIncludesId(snapshot.producers, "producerId", seed.producers[0].producerId);
  assertIncludesId(snapshot.issuers, "issuerId", seed.issuers[0].issuerId);
  assertIncludesId(snapshot.batches, "batchId", seed.batches[0].batchId);
  assertIncludesId(snapshot.events, "eventId", seed.events[0].eventId);
  assertIncludesId(
    snapshot.chainTransactions,
    "txId",
    seed.chainTransactions[0].txId
  );

  if (snapshot.producerDetail.producerId !== seed.producers[0].producerId) {
    throw new Error("Producer detail endpoint returned the wrong record.");
  }
  if (snapshot.batchDetail.batchId !== seed.batches[0].batchId) {
    throw new Error("Batch detail endpoint returned the wrong record.");
  }
  if (!snapshot.verification.completeLifecycle) {
    throw new Error("Verification endpoint did not report a complete lifecycle for the demo seed.");
  }
}

function assertArrayCount(label, value, minimum) {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new Error(`Expected at least ${minimum} ${label} from the API, received ${Array.isArray(value) ? value.length : "non-array"}.`);
  }
}

function assertIncludesId(rows, key, expected) {
  if (!Array.isArray(rows) || !rows.some((row) => row?.[key] === expected)) {
    throw new Error(`Expected ${key}=${expected} in API response.`);
  }
}

async function fetchJson(route) {
  const response = await fetchWithTimeout(`${baseUrl}${route}`);
  if (!response.ok) {
    throw new Error(`Request failed for ${route}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeSnapshot(snapshot) {
  return sortValue({
    ...snapshot,
    verification: {
      ...snapshot.verification,
      verifiedAt: undefined
    }
  });
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortValue(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
