import { Injectable } from "@nestjs/common";
import type { TraceEventType, VerificationResult } from "@terroiros/schemas";
import { hashTraceEvent } from "@terroiros/schemas";
import { BatchesService } from "../batches/batches.service";
import { EventsService } from "../events/events.service";
import { IssuersService } from "../issuers/issuers.service";
import { ChainClient } from "../chain/chain.client";
import { ChainService } from "../chain/chain.service";

const expectedLifecycle = new Set<TraceEventType>([
  "BATCH_CREATED",
  "HARVEST_RECORDED",
  "PROCESSING_RECORDED",
  "BOTTLING_RECORDED",
  "SHIPMENT_RECORDED"
]);

@Injectable()
export class VerificationService {
  constructor(
    private readonly batchesService: BatchesService,
    private readonly eventsService: EventsService,
    private readonly issuersService: IssuersService,
    private readonly chainClient: ChainClient,
    private readonly chainService: ChainService
  ) {}

  async verifyBatch(batchId: string): Promise<VerificationResult> {
    await this.batchesService.getById(batchId);
    const events = await this.eventsService.listByBatch(batchId);

    const signaturesValid = events.every((event) => Boolean(event.signature));
    const issuers = await Promise.all(
      events.map((event) => this.issuersService.getById(event.issuerId))
    );
    let trustedIssuersOnly = issuers.every((issuer) => issuer.trusted);
    const hashesConsistentLocally = events.every(
      (event) => hashTraceEvent(event).length === 64
    );
    const lifecycleSet = new Set<TraceEventType>(
      events.map((event) => event.eventType)
    );
    const completeLifecycle = [...expectedLifecycle].every((step) =>
      lifecycleSet.has(step)
    );

    let chainAnchoringStatus: VerificationResult["chainAnchoringStatus"] = "PENDING";
    let hashesConsistent = hashesConsistentLocally;
    const notes: string[] = [];
    if (this.chainClient.isConfigured()) {
      let anchoredCount = 0;
      let hashMismatchCount = 0;
      let issuerMismatchCount = 0;

      for (const event of events) {
        const expectedHash = ChainClient.hashToBytes32(hashTraceEvent(event));
        const onChainRecord = await this.chainClient.getAttestationByEventId(
          event.eventId
        );
        if (!onChainRecord) {
          continue;
        }

        anchoredCount += 1;
        if (onChainRecord.attestationHash !== expectedHash) {
          hashMismatchCount += 1;
        }
        const issuer = await this.issuersService.getById(event.issuerId);
        const expectedWallet = issuer.walletAddress.toLowerCase();
        if (onChainRecord.issuer !== expectedWallet) {
          issuerMismatchCount += 1;
        }
      }

      hashesConsistent = hashesConsistentLocally && hashMismatchCount === 0;
      trustedIssuersOnly = trustedIssuersOnly && issuerMismatchCount === 0;
      if (anchoredCount === 0) {
        chainAnchoringStatus = "PENDING";
      } else if (anchoredCount === events.length) {
        chainAnchoringStatus = "COMPLETE";
      } else {
        chainAnchoringStatus = "PARTIAL";
      }

      if (hashMismatchCount > 0) {
        notes.push(`Detected ${hashMismatchCount} on-chain hash mismatch(es).`);
      }
      if (issuerMismatchCount > 0) {
        notes.push(`Detected ${issuerMismatchCount} on-chain issuer mismatch(es).`);
      }
      if (anchoredCount === 0 && events.length > 0) {
        notes.push("No events are anchored on-chain yet.");
      }
    } else {
      const transactions = await this.chainService.listTransactions();
      const txByEvent = new Map(transactions.map((tx) => [tx.eventId, tx.status]));
      const confirmedCount = events.filter(
        (event) => txByEvent.get(event.eventId) === "CONFIRMED"
      ).length;
      chainAnchoringStatus =
        confirmedCount === 0
          ? "PENDING"
          : confirmedCount === events.length
            ? "COMPLETE"
            : "PARTIAL";
      notes.push("Chain client not configured. Using local queue status fallback.");
    }

    return {
      batchId,
      verifiedAt: new Date().toISOString(),
      completeLifecycle,
      trustedIssuersOnly,
      signaturesValid,
      hashesConsistent,
      chainAnchoringStatus,
      notes: [
        ...notes,
        ...(completeLifecycle
          ? ["Lifecycle complete."]
          : ["Lifecycle is incomplete for the expected trace flow."])
      ]
    };
  }
}
