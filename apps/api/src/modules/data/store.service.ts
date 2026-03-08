import { Injectable } from "@nestjs/common";
import type { Batch, BatchEvent, Issuer, Producer } from "@terroiros/schemas";

export interface ChainTransaction {
  txId: string;
  eventId: string;
  status: "QUEUED" | "SUBMITTED" | "CONFIRMED" | "FAILED";
  txHash?: string;
  blockNumber?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class StoreService {
  readonly producers = new Map<string, Producer>();
  readonly batches = new Map<string, Batch>();
  readonly issuers = new Map<string, Issuer>();
  readonly batchEvents = new Map<string, BatchEvent>();
  readonly chainTransactions = new Map<string, ChainTransaction>();
  readonly recoveredSignersByEventId = new Map<string, string>();
}
