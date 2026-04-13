import { Injectable } from "@nestjs/common";
import type { Producer } from "@terroiros/schemas";
import { producerSchema } from "@terroiros/schemas";
import { DatabaseService } from "./database.service";
import type { PgRow } from "./database.types";

@Injectable()
export class ProducerRepository {
  private readonly cache = new Map<string, Producer>();

  constructor(private readonly databaseService: DatabaseService) {}

  async save(input: Producer): Promise<Producer> {
    const producer = producerSchema.parse(input);
    await this.databaseService.query(
      `INSERT INTO producers (
          producer_id, legal_name, country_code, region, organization_wallet
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (producer_id) DO UPDATE
        SET legal_name = EXCLUDED.legal_name,
            country_code = EXCLUDED.country_code,
            region = EXCLUDED.region,
            organization_wallet = EXCLUDED.organization_wallet`,
      [
        producer.producerId,
        producer.legalName,
        producer.countryCode,
        producer.region ?? null,
        producer.organizationWallet
      ],
      `save producer ${producer.producerId}`
    );
    this.cache.set(producer.producerId, producer);
    return producer;
  }

  async list(): Promise<Producer[]> {
    const result = await this.databaseService.query(
      `SELECT producer_id, legal_name, country_code, region, organization_wallet
       FROM producers
       ORDER BY created_at ASC`,
      [],
      "list producers"
    );
    if (!result) {
      return [...this.cache.values()];
    }
    const producers = result.rows.map((row) => this.mapRow(row));
    this.refreshCache(producers);
    return producers;
  }

  async findById(producerId: string): Promise<Producer | null> {
    const cached = this.cache.get(producerId);
    if (cached) {
      return cached;
    }
    const result = await this.databaseService.query(
      `SELECT producer_id, legal_name, country_code, region, organization_wallet
       FROM producers
       WHERE producer_id = $1
       LIMIT 1`,
      [producerId],
      `get producer ${producerId}`
    );
    const row = result?.rows[0];
    if (!row) {
      return null;
    }
    const producer = this.mapRow(row);
    this.cache.set(producer.producerId, producer);
    return producer;
  }

  async findByOrganizationWallet(
    organizationWallet: string
  ): Promise<Producer | null> {
    const normalizedWallet = organizationWallet.toLowerCase();
    const cached = [...this.cache.values()].find(
      (producer) =>
        producer.organizationWallet.toLowerCase() === normalizedWallet
    );
    if (cached) {
      return cached;
    }
    const result = await this.databaseService.query(
      `SELECT producer_id, legal_name, country_code, region, organization_wallet
       FROM producers
       WHERE lower(organization_wallet) = lower($1)
       LIMIT 1`,
      [normalizedWallet],
      `get producer by wallet ${normalizedWallet}`
    );
    const row = result?.rows[0];
    if (!row) {
      return null;
    }
    const producer = this.mapRow(row);
    this.cache.set(producer.producerId, producer);
    return producer;
  }

  private mapRow(row: PgRow): Producer {
    return producerSchema.parse({
      producerId: row.producer_id,
      legalName: row.legal_name,
      countryCode: row.country_code,
      region: row.region ?? undefined,
      organizationWallet: row.organization_wallet
    });
  }

  private refreshCache(values: Producer[]): void {
    this.cache.clear();
    for (const value of values) {
      this.cache.set(value.producerId, value);
    }
  }
}
