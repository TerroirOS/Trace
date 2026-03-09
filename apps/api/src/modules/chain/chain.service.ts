import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { hashTraceEvent, sha256Hex, stableStringify } from "@terroiros/schemas";
import { StoreService, type ChainTransaction } from "../data/store.service";
import { ChainClient } from "./chain.client";
import { ChainTransactionsStoreService } from "./chain-transactions.store";

@Injectable()
export class ChainService {
  private processing = false;

  constructor(
    private readonly store: StoreService,
    private readonly chainClient: ChainClient,
    private readonly txStore: ChainTransactionsStoreService
  ) {}

  async queueAttestation(eventId: string): Promise<ChainTransaction> {
    const existingInMemory = [...this.store.chainTransactions.values()].find(
      (tx) => tx.eventId === eventId
    );
    if (existingInMemory) {
      return existingInMemory;
    }

    const existingPersisted = await this.txStore.findByEventId(eventId);
    if (existingPersisted) {
      this.store.chainTransactions.set(existingPersisted.txId, existingPersisted);
      return existingPersisted;
    }

    const now = new Date().toISOString();
    const tx: ChainTransaction = {
      txId: randomUUID(),
      eventId,
      status: "QUEUED",
      retryCount: 0,
      createdAt: now,
      updatedAt: now
    };
    this.store.chainTransactions.set(tx.txId, tx);
    await this.txStore.upsert(tx);
    return tx;
  }

  async listTransactions(): Promise<ChainTransaction[]> {
    if (this.txStore.isEnabled()) {
      const persisted = await this.txStore.list();
      if (persisted.length > 0) {
        for (const tx of persisted) {
          this.store.chainTransactions.set(tx.txId, tx);
        }
        return persisted;
      }
    }
    return [...this.store.chainTransactions.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  async processQueueTick(): Promise<void> {
    if (!this.chainClient.isConfigured()) {
      return;
    }
    if (this.processing) {
      return;
    }
    this.processing = true;
    try {
      const candidates = await this.listTransactions();
      for (const tx of candidates) {
        if (!this.shouldProcess(tx)) {
          continue;
        }

        try {
          if (tx.status === "FAILED" && this.isRetriableError(tx.error)) {
            tx.status = "QUEUED";
            tx.error = undefined;
            tx.updatedAt = new Date().toISOString();
            await this.persist(tx);
          }

          if (tx.status === "QUEUED") {
            const event = this.store.batchEvents.get(tx.eventId);
            if (!event) {
              tx.status = "FAILED";
              tx.error = "Missing in-memory event payload for queue item.";
              tx.retryCount = (tx.retryCount ?? 0) + 1;
              tx.updatedAt = new Date().toISOString();
              await this.persist(tx);
              continue;
            }

            const eventHash = hashTraceEvent(event);
            const batch = this.store.batches.get(event.batchId);
            if (!batch) {
              tx.status = "FAILED";
              tx.error = `Missing batch ${event.batchId} for attestation.`;
              tx.retryCount = (tx.retryCount ?? 0) + 1;
              tx.updatedAt = new Date().toISOString();
              await this.persist(tx);
              continue;
            }
            const batchFingerprint = this.computeBatchFingerprint(
              event.batchId,
              eventHash
            );
            await this.chainClient.ensureBatchAnchor({
              batchId: event.batchId,
              batchFingerprint
            });
            const submission = await this.chainClient.recordAttestation({
              eventId: event.eventId,
              batchId: event.batchId,
              eventHash
            });

            tx.status = "SUBMITTED";
            tx.txHash = submission.txHash;
            tx.updatedAt = new Date().toISOString();
            await this.persist(tx);
            continue;
          }

          if (tx.status === "SUBMITTED" && tx.txHash) {
            const receipt = await this.chainClient.getTransactionReceipt(tx.txHash);
            if (!receipt) {
              continue;
            }
            if (receipt.status === 0) {
              tx.status = "FAILED";
              tx.error = "Transaction reverted on-chain.";
              tx.retryCount = (tx.retryCount ?? 0) + 1;
              tx.updatedAt = new Date().toISOString();
              await this.persist(tx);
              continue;
            }

            tx.status = "CONFIRMED";
            tx.blockNumber = receipt.blockNumber;
            tx.updatedAt = new Date().toISOString();
            await this.persist(tx);
          }
        } catch (error) {
          tx.status = "FAILED";
          tx.error = this.formatError(error);
          tx.retryCount = (tx.retryCount ?? 0) + 1;
          tx.updatedAt = new Date().toISOString();
          await this.persist(tx);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private shouldProcess(tx: ChainTransaction): boolean {
    if (tx.status === "QUEUED" || tx.status === "SUBMITTED") {
      return true;
    }
    if (tx.status !== "FAILED") {
      return false;
    }
    if (!this.isRetriableError(tx.error)) {
      return false;
    }
    const retries = tx.retryCount ?? 0;
    if (retries >= 3) {
      return false;
    }
    const retryDelayMs = 20_000;
    const updatedAt = Date.parse(tx.updatedAt);
    if (Number.isNaN(updatedAt)) {
      return true;
    }
    return Date.now() - updatedAt >= retryDelayMs;
  }

  private isRetriableError(errorMessage: string | undefined): boolean {
    if (!errorMessage) {
      return false;
    }
    const candidate = errorMessage.toLowerCase();
    return (
      candidate.includes("timeout") ||
      candidate.includes("underpriced") ||
      candidate.includes("replacement") ||
      candidate.includes("nonce") ||
      candidate.includes("network") ||
      candidate.includes("temporar")
    );
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private async persist(tx: ChainTransaction): Promise<void> {
    this.store.chainTransactions.set(tx.txId, tx);
    await this.txStore.upsert(tx);
  }

  private computeBatchFingerprint(batchId: string, fallbackEventHash: string): string {
    const batch = this.store.batches.get(batchId);
    if (!batch) {
      return fallbackEventHash;
    }
    const earliestEventHash = this.getEarliestEventHash(batchId) ?? fallbackEventHash;
    const canonical = stableStringify({
      batchId: batch.batchId,
      producerId: batch.producerId,
      productType: batch.productType,
      varietalOrSubtype: batch.varietalOrSubtype,
      vineyardOrFarmLocation: batch.vineyardOrFarmLocation,
      harvestDate: batch.harvestDate,
      schemaVersion: batch.schemaVersion,
      earliestEventHash
    });
    return sha256Hex(canonical);
  }

  private getEarliestEventHash(batchId: string): string | null {
    const events = [...this.store.batchEvents.values()]
      .filter((event) => event.batchId === batchId)
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    const first = events[0];
    if (!first) {
      return null;
    }
    return this.store.eventHashesByEventId.get(first.eventId) ?? hashTraceEvent(first);
  }
}
