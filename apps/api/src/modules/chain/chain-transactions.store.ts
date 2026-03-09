import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ChainTransaction } from "../data/store.service";

type PgRowSet = { rows: Record<string, unknown>[] };
type PgPoolLike = {
  query: (text: string, values?: unknown[]) => Promise<PgRowSet>;
  end: () => Promise<void>;
};

@Injectable()
export class ChainTransactionsStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(ChainTransactionsStoreService.name);
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

  async list(): Promise<ChainTransaction[]> {
    if (!this.pool) {
      return [];
    }
    try {
      const result = await this.pool.query(
        `SELECT tx_id, event_id, status, tx_hash, block_number, error, retry_count, created_at, updated_at
         FROM chain_transactions
         ORDER BY created_at DESC`
      );
      return result.rows.map((row: Record<string, unknown>) => ({
        txId: row.tx_id as string,
        eventId: row.event_id as string,
        status: row.status as ChainTransaction["status"],
        txHash: (row.tx_hash as string) ?? undefined,
        blockNumber: row.block_number ? Number(row.block_number) : undefined,
        error: (row.error as string) ?? undefined,
        retryCount: Number(row.retry_count ?? 0),
        createdAt: new Date(row.created_at as string).toISOString(),
        updatedAt: new Date(row.updated_at as string).toISOString()
      }));
    } catch (error) {
      this.logger.warn(`Failed to list chain transactions: ${String(error)}`);
      return [];
    }
  }

  async findByEventId(eventId: string): Promise<ChainTransaction | null> {
    if (!this.pool) {
      return null;
    }
    try {
      const result = await this.pool.query(
        `SELECT tx_id, event_id, status, tx_hash, block_number, error, retry_count, created_at, updated_at
         FROM chain_transactions
         WHERE event_id = $1
         LIMIT 1`,
        [eventId]
      );
      const row = result.rows[0];
      if (!row) {
        return null;
      }
      return {
        txId: row.tx_id as string,
        eventId: row.event_id as string,
        status: row.status as ChainTransaction["status"],
        txHash: (row.tx_hash as string) ?? undefined,
        blockNumber: row.block_number ? Number(row.block_number) : undefined,
        error: (row.error as string) ?? undefined,
        retryCount: Number(row.retry_count ?? 0),
        createdAt: new Date(row.created_at as string).toISOString(),
        updatedAt: new Date(row.updated_at as string).toISOString()
      };
    } catch (error) {
      this.logger.warn(
        `Failed to query chain transaction by event id ${eventId}: ${String(error)}`
      );
      return null;
    }
  }

  async upsert(tx: ChainTransaction): Promise<void> {
    if (!this.pool) {
      return;
    }
    try {
      await this.pool.query(
        `INSERT INTO chain_transactions (
            tx_id, event_id, status, tx_hash, block_number, error, retry_count, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (tx_id) DO UPDATE
          SET status = EXCLUDED.status,
              tx_hash = EXCLUDED.tx_hash,
              block_number = EXCLUDED.block_number,
              error = EXCLUDED.error,
              retry_count = EXCLUDED.retry_count,
              updated_at = EXCLUDED.updated_at`,
        [
          tx.txId,
          tx.eventId,
          tx.status,
          tx.txHash ?? null,
          tx.blockNumber ?? null,
          tx.error ?? null,
          tx.retryCount ?? 0,
          tx.createdAt,
          tx.updatedAt
        ]
      );
    } catch (error) {
      this.logger.warn(
        `Failed to upsert chain transaction ${tx.txId}: ${String(error)}`
      );
    }
  }
}
