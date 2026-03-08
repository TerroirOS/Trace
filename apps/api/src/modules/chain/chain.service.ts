import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { StoreService, type ChainTransaction } from "../data/store.service";

@Injectable()
export class ChainService {
  constructor(private readonly store: StoreService) {}

  queueAttestation(eventId: string): ChainTransaction {
    const now = new Date().toISOString();
    const tx: ChainTransaction = {
      txId: randomUUID(),
      eventId,
      status: "QUEUED",
      createdAt: now,
      updatedAt: now
    };
    this.store.chainTransactions.set(tx.txId, tx);
    return tx;
  }

  listTransactions(): ChainTransaction[] {
    return [...this.store.chainTransactions.values()];
  }

  processQueueTick(): void {
    const queued = [...this.store.chainTransactions.values()].filter(
      (tx) => tx.status === "QUEUED" || tx.status === "SUBMITTED"
    );
    for (const tx of queued) {
      const now = new Date().toISOString();
      if (tx.status === "QUEUED") {
        tx.status = "SUBMITTED";
        tx.txHash = `0x${tx.txId.replace(/-/g, "").slice(0, 64).padEnd(64, "0")}`;
        tx.updatedAt = now;
        continue;
      }
      tx.status = "CONFIRMED";
      tx.blockNumber = Math.floor(Date.now() / 1000);
      tx.updatedAt = now;
    }
  }
}
