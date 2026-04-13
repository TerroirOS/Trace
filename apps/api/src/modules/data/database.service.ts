import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PgPoolLike, PgRowSet } from "./database.types";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: PgPoolLike | null;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.get<string>("DATABASE_URL");
    if (!databaseUrl) {
      this.pool = null;
      return;
    }
    const { Pool } = require("pg") as {
      Pool: new (config: { connectionString: string }) => PgPoolLike;
    };
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.pool) {
      return;
    }
    await this.pool.end();
  }

  isEnabled(): boolean {
    return Boolean(this.pool);
  }

  async query(
    sql: string,
    values: unknown[],
    context: string
  ): Promise<PgRowSet | null> {
    if (!this.pool) {
      return null;
    }
    try {
      return await this.pool.query(sql, values);
    } catch (error) {
      this.logger.warn(`Failed to ${context}: ${String(error)}`);
      return null;
    }
  }
}
