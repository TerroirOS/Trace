export interface ChainTransaction {
  txId: string;
  eventId: string;
  status: "QUEUED" | "SUBMITTED" | "CONFIRMED" | "FAILED";
  txHash?: string;
  blockNumber?: number;
  error?: string;
  retryCount?: number;
  createdAt: string;
  updatedAt: string;
}
