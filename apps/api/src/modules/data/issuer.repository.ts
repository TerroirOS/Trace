import { Injectable } from "@nestjs/common";
import type { Issuer } from "@terroiros/schemas";
import { issuerSchema } from "@terroiros/schemas";
import { DatabaseService } from "./database.service";
import type { PgRow } from "./database.types";

@Injectable()
export class IssuerRepository {
  private readonly cache = new Map<string, Issuer>();

  constructor(private readonly databaseService: DatabaseService) {}

  async save(input: Issuer): Promise<Issuer> {
    const issuer = issuerSchema.parse(input);
    await this.databaseService.query(
      `INSERT INTO issuers (
          issuer_id, organization_name, wallet_address, roles, trusted
        )
        VALUES ($1, $2, $3, $4::jsonb, $5)
        ON CONFLICT (issuer_id) DO UPDATE
        SET organization_name = EXCLUDED.organization_name,
            wallet_address = EXCLUDED.wallet_address,
            roles = EXCLUDED.roles,
            trusted = EXCLUDED.trusted`,
      [
        issuer.issuerId,
        issuer.organizationName,
        issuer.walletAddress,
        JSON.stringify(issuer.roles),
        issuer.trusted
      ],
      `save issuer ${issuer.issuerId}`
    );
    this.cache.set(issuer.issuerId, issuer);
    return issuer;
  }

  async list(): Promise<Issuer[]> {
    const result = await this.databaseService.query(
      `SELECT issuer_id, organization_name, wallet_address, roles, trusted
       FROM issuers
       ORDER BY created_at ASC`,
      [],
      "list issuers"
    );
    if (!result) {
      return [...this.cache.values()];
    }
    const issuers = result.rows.map((row) => this.mapRow(row));
    this.refreshCache(issuers);
    return issuers;
  }

  async findById(issuerId: string): Promise<Issuer | null> {
    const cached = this.cache.get(issuerId);
    if (cached) {
      return cached;
    }
    const result = await this.databaseService.query(
      `SELECT issuer_id, organization_name, wallet_address, roles, trusted
       FROM issuers
       WHERE issuer_id = $1
       LIMIT 1`,
      [issuerId],
      `get issuer ${issuerId}`
    );
    const row = result?.rows[0];
    if (!row) {
      return null;
    }
    const issuer = this.mapRow(row);
    this.cache.set(issuer.issuerId, issuer);
    return issuer;
  }

  private mapRow(row: PgRow): Issuer {
    return issuerSchema.parse({
      issuerId: row.issuer_id,
      organizationName: row.organization_name,
      walletAddress: row.wallet_address,
      roles: this.parseJsonArray(row.roles),
      trusted: Boolean(row.trusted)
    });
  }

  private parseJsonArray(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value !== "string") {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private refreshCache(values: Issuer[]): void {
    this.cache.clear();
    for (const value of values) {
      this.cache.set(value.issuerId, value);
    }
  }
}
