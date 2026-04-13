import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const defaultSeedFile = path.join(
  repoRoot,
  "docs",
  "sample-data",
  "georgian-wine-demo.json"
);
const dryRun = process.argv.includes("--dry-run");
const databaseUrl = process.env.DATABASE_URL;
const seedFile = process.env.TRACE_SEED_FILE
  ? path.resolve(repoRoot, process.env.TRACE_SEED_FILE)
  : defaultSeedFile;

function normalizeRecord(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeRecord(entry));
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeRecord(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(normalizeRecord(value));
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashTraceEvent(event) {
  return sha256Hex(
    stableStringify({
      ...event,
      signature: undefined
    })
  );
}

function buildDocumentRows(events) {
  return events.flatMap((event) =>
    event.documentRefs.map((documentRef) => ({
      eventId: event.eventId,
      uri: documentRef.uri,
      contentHash: documentRef.contentHash,
      mediaType: documentRef.mediaType ?? null,
      visibility: documentRef.visibility
    }))
  );
}

function buildSeedState(seedData) {
  const eventHashes = new Map();
  const events = seedData.events.map((event, index) => {
    const prevEventHash =
      event.prevEventHash ??
      (index > 0 ? eventHashes.get(seedData.events[index - 1].eventId) ?? null : null);
    const hydrated = {
      schemaVersion: event.schemaVersion ?? "1.0.0",
      eventId: event.eventId,
      batchId: event.batchId,
      eventType: event.eventType,
      issuerId: event.issuerId,
      timestamp: event.timestamp,
      payload: event.payload ?? {},
      payoutReference: event.payoutReference ?? null,
      documentRefs: event.documentRefs ?? [],
      prevEventHash: prevEventHash ?? undefined,
      signature: event.signature
    };
    const eventHash = hashTraceEvent(hydrated);
    eventHashes.set(hydrated.eventId, eventHash);
    return {
      ...hydrated,
      eventHash
    };
  });

  const chainTransactions = (seedData.chainTransactions ?? []).map((tx) => ({
    txId: tx.txId,
    eventId: tx.eventId,
    status: tx.status,
    txHash: tx.txHash ?? null,
    blockNumber: tx.blockNumber ?? null,
    error: tx.error ?? null,
    retryCount: tx.retryCount ?? 0,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt
  }));

  return {
    producers: seedData.producers ?? [],
    issuers: seedData.issuers ?? [],
    batches: seedData.batches ?? [],
    events,
    documents: buildDocumentRows(events),
    chainTransactions
  };
}

async function readSeedData() {
  const raw = await readFile(seedFile, "utf8");
  return JSON.parse(raw);
}

function printSummary(seedState) {
  console.log(`Seed file: ${path.relative(repoRoot, seedFile)}`);
  console.log(`Producers: ${seedState.producers.length}`);
  console.log(`Issuers: ${seedState.issuers.length}`);
  console.log(`Batches: ${seedState.batches.length}`);
  console.log(`Events: ${seedState.events.length}`);
  console.log(`Documents: ${seedState.documents.length}`);
  console.log(`Chain transactions: ${seedState.chainTransactions.length}`);
}

async function main() {
  const seedData = await readSeedData();
  const seedState = buildSeedState(seedData);

  if (dryRun) {
    printSummary(seedState);
    return;
  }

  let Client;
  try {
    ({ Client } = await import("pg"));
  } catch {
    throw new Error(
      "The 'pg' package is required for database seeding. Run npm.cmd install before using db:seed."
    );
  }

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required for seeding. Set it in the environment or pass --dry-run."
    );
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    const eventIds = seedState.events.map((event) => event.eventId);
    const batchIds = seedState.batches.map((batch) => batch.batchId);
    const issuerIds = seedState.issuers.map((issuer) => issuer.issuerId);
    const producerIds = seedState.producers.map((producer) => producer.producerId);
    const txIds = seedState.chainTransactions.map((tx) => tx.txId);

    if (txIds.length > 0) {
      await client.query(
        `DELETE FROM chain_transactions
         WHERE tx_id = ANY($1::text[]) OR event_id = ANY($2::text[])`,
        [txIds, eventIds]
      );
    }
    if (eventIds.length > 0) {
      await client.query(`DELETE FROM documents WHERE event_id = ANY($1::text[])`, [
        eventIds
      ]);
      await client.query(`DELETE FROM batch_events WHERE event_id = ANY($1::text[])`, [
        eventIds
      ]);
    }
    if (batchIds.length > 0) {
      await client.query(`DELETE FROM external_events WHERE related_batch_id = ANY($1::text[])`, [
        batchIds
      ]);
      await client.query(`DELETE FROM batches WHERE batch_id = ANY($1::text[])`, [batchIds]);
    }
    if (issuerIds.length > 0) {
      await client.query(`DELETE FROM issuers WHERE issuer_id = ANY($1::text[])`, [issuerIds]);
    }
    if (producerIds.length > 0) {
      await client.query(`DELETE FROM producers WHERE producer_id = ANY($1::text[])`, [
        producerIds
      ]);
    }

    for (const producer of seedState.producers) {
      await client.query(
        `INSERT INTO producers (
           producer_id, legal_name, country_code, region, organization_wallet
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          producer.producerId,
          producer.legalName,
          producer.countryCode,
          producer.region ?? null,
          producer.organizationWallet
        ]
      );
    }

    for (const issuer of seedState.issuers) {
      await client.query(
        `INSERT INTO issuers (
           issuer_id, organization_name, wallet_address, roles, trusted
         )
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [
          issuer.issuerId,
          issuer.organizationName,
          issuer.walletAddress,
          JSON.stringify(issuer.roles),
          issuer.trusted
        ]
      );
    }

    for (const batch of seedState.batches) {
      await client.query(
        `INSERT INTO batches (
           batch_id, producer_id, product_type, varietal_or_subtype,
           vineyard_or_farm_location, harvest_date, schema_version
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          batch.batchId,
          batch.producerId,
          batch.productType,
          batch.varietalOrSubtype,
          batch.vineyardOrFarmLocation,
          batch.harvestDate,
          batch.schemaVersion
        ]
      );
    }

    for (const event of seedState.events) {
      await client.query(
        `INSERT INTO batch_events (
           event_id, batch_id, schema_version, event_type, issuer_id, event_timestamp,
           payload, payout_reference, document_refs, prev_event_hash, signature, event_hash
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11, $12)`,
        [
          event.eventId,
          event.batchId,
          event.schemaVersion,
          event.eventType,
          event.issuerId,
          event.timestamp,
          JSON.stringify(event.payload),
          event.payoutReference,
          JSON.stringify(event.documentRefs),
          event.prevEventHash ?? null,
          event.signature,
          event.eventHash
        ]
      );
    }

    for (const documentRow of seedState.documents) {
      await client.query(
        `INSERT INTO documents (
           event_id, uri, content_hash, media_type, visibility
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          documentRow.eventId,
          documentRow.uri,
          documentRow.contentHash,
          documentRow.mediaType,
          documentRow.visibility
        ]
      );
    }

    for (const tx of seedState.chainTransactions) {
      await client.query(
        `INSERT INTO chain_transactions (
           tx_id, event_id, status, tx_hash, block_number, error, retry_count, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          tx.txId,
          tx.eventId,
          tx.status,
          tx.txHash,
          tx.blockNumber,
          tx.error,
          tx.retryCount,
          tx.createdAt,
          tx.updatedAt
        ]
      );
    }

    await client.query("COMMIT");
    printSummary(seedState);
    console.log("Seeded demo Trace data successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
