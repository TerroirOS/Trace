import { Injectable } from "@nestjs/common";
import type { Batch } from "@terroiros/schemas";
import { batchSchema } from "@terroiros/schemas";
import { DatabaseService } from "./database.service";
import type { PgRow } from "./database.types";

@Injectable()
export class BatchRepository {
  private readonly cache = new Map<string, Batch>();

  constructor(private readonly databaseService: DatabaseService) {}

  async save(input: Batch): Promise<Batch> {
    const batch = batchSchema.parse(input);
    await this.databaseService.query(
      `INSERT INTO batches (
          batch_id, producer_id, product_type, varietal_or_subtype,
          vineyard_or_farm_location, harvest_date, schema_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (batch_id) DO UPDATE
        SET producer_id = EXCLUDED.producer_id,
            product_type = EXCLUDED.product_type,
            varietal_or_subtype = EXCLUDED.varietal_or_subtype,
            vineyard_or_farm_location = EXCLUDED.vineyard_or_farm_location,
            harvest_date = EXCLUDED.harvest_date,
            schema_version = EXCLUDED.schema_version`,
      [
        batch.batchId,
        batch.producerId,
        batch.productType,
        batch.varietalOrSubtype,
        batch.vineyardOrFarmLocation,
        batch.harvestDate,
        batch.schemaVersion
      ],
      `save batch ${batch.batchId}`
    );
    this.cache.set(batch.batchId, batch);
    return batch;
  }

  async list(): Promise<Batch[]> {
    const result = await this.databaseService.query(
      `SELECT batch_id, producer_id, product_type, varietal_or_subtype,
              vineyard_or_farm_location, harvest_date, schema_version
       FROM batches
       ORDER BY created_at ASC`,
      [],
      "list batches"
    );
    if (!result) {
      return [...this.cache.values()];
    }
    const batches = result.rows.map((row) => this.mapRow(row));
    this.refreshCache(batches);
    return batches;
  }

  async findById(batchId: string): Promise<Batch | null> {
    const cached = this.cache.get(batchId);
    if (cached) {
      return cached;
    }
    const result = await this.databaseService.query(
      `SELECT batch_id, producer_id, product_type, varietal_or_subtype,
              vineyard_or_farm_location, harvest_date, schema_version
       FROM batches
       WHERE batch_id = $1
       LIMIT 1`,
      [batchId],
      `get batch ${batchId}`
    );
    const row = result?.rows[0];
    if (!row) {
      return null;
    }
    const batch = this.mapRow(row);
    this.cache.set(batch.batchId, batch);
    return batch;
  }

  async findDuplicate(batch: Batch): Promise<Batch | null> {
    const normalized = this.toDuplicateKey(batch);
    const cached = [...this.cache.values()].find(
      (entry) => this.toDuplicateKey(entry) === normalized && entry.batchId !== batch.batchId
    );
    if (cached) {
      return cached;
    }
    const result = await this.databaseService.query(
      `SELECT batch_id, producer_id, product_type, varietal_or_subtype,
              vineyard_or_farm_location, harvest_date, schema_version
       FROM batches
       WHERE producer_id = $1
         AND lower(product_type) = lower($2)
         AND lower(varietal_or_subtype) = lower($3)
         AND lower(vineyard_or_farm_location) = lower($4)
         AND harvest_date = $5
         AND batch_id <> $6
       LIMIT 1`,
      [
        batch.producerId,
        batch.productType,
        batch.varietalOrSubtype,
        batch.vineyardOrFarmLocation,
        batch.harvestDate,
        batch.batchId
      ],
      `find duplicate batch ${batch.batchId}`
    );
    const row = result?.rows[0];
    if (!row) {
      return null;
    }
    const duplicate = this.mapRow(row);
    this.cache.set(duplicate.batchId, duplicate);
    return duplicate;
  }

  private mapRow(row: PgRow): Batch {
    const harvestDate =
      typeof row.harvest_date === "string"
        ? row.harvest_date.slice(0, 10)
        : new Date(row.harvest_date as string).toISOString().slice(0, 10);
    return batchSchema.parse({
      batchId: row.batch_id,
      producerId: row.producer_id,
      productType: row.product_type,
      varietalOrSubtype: row.varietal_or_subtype,
      vineyardOrFarmLocation: row.vineyard_or_farm_location,
      harvestDate,
      schemaVersion: row.schema_version
    });
  }

  private refreshCache(values: Batch[]): void {
    this.cache.clear();
    for (const value of values) {
      this.cache.set(value.batchId, value);
    }
  }

  private toDuplicateKey(batch: Batch): string {
    return [
      batch.producerId.trim(),
      batch.productType.trim().toLowerCase(),
      batch.varietalOrSubtype.trim().toLowerCase(),
      batch.vineyardOrFarmLocation.trim().toLowerCase(),
      batch.harvestDate
    ].join("|");
  }
}
