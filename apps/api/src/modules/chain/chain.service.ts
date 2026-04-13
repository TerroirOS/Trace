import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { hashTraceEvent, sha256Hex, stableStringify } from "@terroiros/schemas";
import type { ChainTransaction } from "../data/chain-transaction.types";
import { StoreService } from "../data/store.service";
import { ChainClient } from "./chain.client";

@Injectable()
export class ChainService {
  private processing = false;

  constructor(
    private readonly store: StoreService,
    private readonly chainClient: ChainClient
  ) {}

  async queueAttestation(eventId: string): Promise<ChainTransaction> {
    const existingPersisted = await this.store.getChainTransactionByEventId(eventId);
    if (existingPersisted) {
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
    return this.store.saveChainTransaction(tx);
  }

  async listTransactions(): Promise<ChainTransaction[]> {
    const persisted = await this.store.listChainTransactions();
    if (persisted.length > 0) {
      return persisted;
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
            const event = await this.store.getBatchEventById(tx.eventId);
            const eventHash =
              (await this.store.getEventHashById(event.eventId)) ?? hashTraceEvent(event);
            const batch = await this.store.getBatchById(event.batchId);
            const batchFingerprint = await this.computeBatchFingerprint(
              batch.batchId,
              eventHash
            );
            await this.chainClient.ensureBatchAnchor({
              batchId: batch.batchId,
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
    await this.store.saveChainTransaction(tx);
  }

  private async computeBatchFingerprint(
    batchId: string,
    fallbackEventHash: string
  ): Promise<string> {
    const batch = await this.store.getBatchById(batchId);
    if (!batch) {
      return fallbackEventHash;
    }
    const earliestEventHash =
      (await this.getEarliestEventHash(batchId)) ?? fallbackEventHash;
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

  private async getEarliestEventHash(batchId: string): Promise<string | null> {
    const events = await this.store.listBatchEventsByBatchId(batchId);
    const first = events[0];
    if (!first) {
      return null;
    }
    return (await this.store.getEventHashById(first.eventId)) ?? hashTraceEvent(first);
  }
}
