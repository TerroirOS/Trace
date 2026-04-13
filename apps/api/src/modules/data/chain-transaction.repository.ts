import { Injectable } from "@nestjs/common";
import type { ChainTransaction } from "./chain-transaction.types";
import { DatabaseService } from "./database.service";
import type { PgRow } from "./database.types";

@Injectable()
export class ChainTransactionRepository {
  private readonly cache = new Map<string, ChainTransaction>();

  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<ChainTransaction[]> {
    const result = await this.databaseService.query(
      `SELECT tx_id, event_id, status, tx_hash, block_number, error, retry_count, created_at, updated_at
       FROM chain_transactions
       ORDER BY created_at DESC`,
      [],
      "list chain transactions"
    );
    if (!result) {
      return [...this.cache.values()].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt)
      );
    }
    const transactions = result.rows.map((row) => this.mapRow(row));
    this.refreshCache(transactions);
    return transactions;
  }

  async findByEventId(eventId: string): Promise<ChainTransaction | null> {
    const cached = [...this.cache.values()].find((tx) => tx.eventId === eventId);
    if (cached) {
      return cached;
    }
    const result = await this.databaseService.query(
      `SELECT tx_id, event_id, status, tx_hash, block_number, error, retry_count, created_at, updated_at
       FROM chain_transactions
       WHERE event_id = $1
       LIMIT 1`,
      [eventId],
      `get chain transaction for event ${eventId}`
    );
    const row = result?.rows[0];
    if (!row) {
      return null;
    }
    const transaction = this.mapRow(row);
    this.cache.set(transaction.txId, transaction);
    return transaction;
  }

  async upsert(tx: ChainTransaction): Promise<ChainTransaction> {
    await this.databaseService.query(
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
      ],
      `upsert chain transaction ${tx.txId}`
    );
    this.cache.set(tx.txId, tx);
    return tx;
  }

  private mapRow(row: PgRow): ChainTransaction {
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
  }

  private refreshCache(values: ChainTransaction[]): void {
    this.cache.clear();
    for (const value of values) {
      this.cache.set(value.txId, value);
    }
  }
}
