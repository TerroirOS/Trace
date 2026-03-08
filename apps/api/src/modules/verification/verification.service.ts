import { Injectable } from "@nestjs/common";
import type { TraceEventType, VerificationResult } from "@terroiros/schemas";
import { hashTraceEvent } from "@terroiros/schemas";
import { BatchesService } from "../batches/batches.service";
import { EventsService } from "../events/events.service";
import { IssuersService } from "../issuers/issuers.service";
import { StoreService } from "../data/store.service";

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
    private readonly store: StoreService
  ) {}

  verifyBatch(batchId: string): VerificationResult {
    this.batchesService.getById(batchId);
    const events = this.eventsService.listByBatch(batchId);

    const signaturesValid = events.every((event) => Boolean(event.signature));
    const trustedIssuersOnly = events.every((event) => {
      const issuer = this.issuersService.getById(event.issuerId);
      return issuer.trusted;
    });
    const hashesConsistent = events.every((event) => hashTraceEvent(event).length === 64);
    const lifecycleSet = new Set<TraceEventType>(
      events.map((event) => event.eventType)
    );
    const completeLifecycle = [...expectedLifecycle].every((step) =>
      lifecycleSet.has(step)
    );

    const txByEvent = new Map(
      [...this.store.chainTransactions.values()].map((tx) => [tx.eventId, tx.status])
    );
    const confirmedCount = events.filter(
      (event) => txByEvent.get(event.eventId) === "CONFIRMED"
    ).length;
    const chainAnchoringStatus =
      confirmedCount === 0
        ? "PENDING"
        : confirmedCount === events.length
          ? "COMPLETE"
          : "PARTIAL";

    return {
      batchId,
      verifiedAt: new Date().toISOString(),
      completeLifecycle,
      trustedIssuersOnly,
      signaturesValid,
      hashesConsistent,
      chainAnchoringStatus,
      notes: completeLifecycle
        ? ["Lifecycle complete."]
        : ["Lifecycle is incomplete for the expected trace flow."]
    };
  }
}
