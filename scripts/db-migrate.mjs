import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const dryRun = process.argv.includes("--dry-run");
const databaseUrl = process.env.DATABASE_URL;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function listMigrationFiles() {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function loadMigrations() {
  const files = await listMigrationFiles();
  return Promise.all(
    files.map(async (file) => {
      const absolutePath = path.join(migrationsDir, file);
      const sql = await readFile(absolutePath, "utf8");
      return {
        file,
        absolutePath,
        sql,
        checksum: sha256(sql)
      };
    })
  );
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function loadAppliedMigrations(client) {
  const result = await client.query(
    `SELECT filename, checksum, applied_at
     FROM schema_migrations
     ORDER BY filename ASC`
  );
  return new Map(
    result.rows.map((row) => [
      row.filename,
      {
        checksum: row.checksum,
        appliedAt: new Date(row.applied_at).toISOString()
      }
    ])
  );
}

function printPlan(migrations, applied) {
  for (const migration of migrations) {
    const existing = applied.get(migration.file);
    if (!existing) {
      console.log(`PENDING ${migration.file}`);
      continue;
    }
    const status =
      existing.checksum === migration.checksum ? "APPLIED" : "CHECKSUM_MISMATCH";
    console.log(`${status} ${migration.file}`);
  }
}

async function main() {
  const migrations = await loadMigrations();

  if (dryRun && !databaseUrl) {
    printPlan(migrations, new Map());
    console.log(
      "Dry run completed without a database connection because DATABASE_URL is not set."
    );
    return;
  }

  let Client;
  try {
    ({ Client } = await import("pg"));
  } catch {
    throw new Error(
      "The 'pg' package is required for database migrations. Run npm.cmd install before using db:migrate."
    );
  }

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required for migrations. Set it in the environment or pass --dry-run."
    );
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await ensureMigrationTable(client);
    const applied = await loadAppliedMigrations(client);

    if (dryRun) {
      printPlan(migrations, applied);
      return;
    }

    let appliedCount = 0;
    for (const migration of migrations) {
      const existing = applied.get(migration.file);
      if (existing) {
        if (existing.checksum !== migration.checksum) {
          throw new Error(
            `Migration ${migration.file} was already applied with a different checksum.`
          );
        }
        console.log(`SKIP ${migration.file}`);
        continue;
      }

      console.log(`APPLY ${migration.file}`);
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO schema_migrations (filename, checksum)
           VALUES ($1, $2)`,
          [migration.file, migration.checksum]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      appliedCount += 1;
    }

    console.log(
      appliedCount === 0
        ? "Database schema is already up to date."
        : `Applied ${appliedCount} migration${appliedCount === 1 ? "" : "s"}.`
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
